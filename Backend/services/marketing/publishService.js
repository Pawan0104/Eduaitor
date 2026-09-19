import MarketingPost from "../../models/marketingPost.js";
import MarketingSocialAccount from "../../models/marketingSocialAccount.js";
import { decryptSecret } from "../../utils/cryptoVault.js";

const GRAPH_BASE = "https://graph.facebook.com";
const GRAPH_VERSION = "v21.0";

const graphFetch = async (path, params) => {
  const qs = new URLSearchParams(params).toString();
  const res = await fetch(`${GRAPH_BASE}/${path}?${qs}`, { method: "POST" });
  const data = await res.json();
  if (!res.ok) {
    const msg =
      data?.error?.message || `Graph API error (${res.status})`;
    const code = data?.error?.code;
    throw new Error(`${msg}${code ? ` [code ${code}]` : ""}`);
  }
  return data;
};

const publishFacebook = async ({ token, pageId, message }) => {
  if (!pageId) {
    throw new Error(
      "Facebook page is not connected. Set accountMeta.pageId when connecting the account.",
    );
  }
  const data = await graphFetch(`${pageId}/feed`, {
    message,
    access_token: token,
  });
  return {
    messageId: data.id,
    permalink: `https://www.facebook.com/${data.id}`,
  };
};

const publishInstagram = async ({ token, igUserId, ver }) => {
  if (!igUserId) {
    throw new Error(
      "Instagram business user id is missing. Connect it in accountMeta.igUserId.",
    );
  }
  const mediaUrl = ver.media?.[0]?.url;
  if (!mediaUrl) {
    throw new Error(
      "Instagram posts need an image. Upload media (or generate a poster) before publishing.",
    );
  }
  const caption = [ver.text, ver.hashtags?.join("  ")?.trim()]
    .filter(Boolean)
    .join("\n");
  const creation = await graphFetch(`${igUserId}/media`, {
    image_url: mediaUrl,
    caption,
    access_token: token,
  });
  const published = await graphFetch(`${igUserId}/media_publish`, {
    creation_id: creation.id,
    access_token: token,
  });
  return {
    messageId: published.id,
    permalink: `https://www.instagram.com/p/${published.id}/`,
  };
};

const unsupported = (channel) => {
  throw new Error(
    `${channel} publishing is not wired in Phase 1 (Facebook + Instagram only).`,
  );
};

/**
 * Core approval invariant: only APPROVED (or downstream) posts may publish.
 * Idempotent: if providerMessageIds[channel] already exists we return it.
 * Failures increment attempts and persist lastError for the retry UI.
 */
export const publishPost = async ({ postId, actor }) => {
  const post = await MarketingPost.findById(postId);
  if (!post) throw new Error("Post not found.");

  if (!["APPROVED", "SCHEDULED", "PUBLISHING", "FAILED", "RETRY_EXHAUSTED"].includes(post.status)) {
    throw new Error(
      "Post must be approved before publishing (currently " + post.status + ").",
    );
  }
  if (!post.workflow?.approvedBy || !post.workflow?.approvedAt) {
    throw new Error("Approval record missing — cannot publish unapproved content.");
  }
  if (post.status !== "RETRY_EXHAUSTED" && post.publish?.providerMessageIds?.[post.channel]) {
    return {
      postId: String(post._id),
      alreadyPublished: true,
      messageId: post.publish.providerMessageIds[post.channel],
    };
  }

  const account = await MarketingSocialAccount.findOne({
    schoolId: post.schoolId,
    channel: post.channel,
    status: "active",
  });
  if (!account) {
    throw new Error(
      `No active ${post.channel} account connected for this school.`,
    );
  }

  const token = decryptSecret(account.tokenBox);
  if (!token) {
    throw new Error("Account token is missing or could not be decrypted.");
  }

  const ver = post.versions?.[post.currentVersion] || {};
  const text = [ver.text, ver.hashtags?.join(" ")?.trim()]
    .filter(Boolean)
    .join("\n\n");

  await post.updateOne({
    $set: {
      status: "PUBLISHING",
      "publish.attempts": (post.publish?.attempts || 0) + 1,
      "workflow.publishedBy": actor || post.workflow?.publishedBy,
    },
  });

  let result;
  try {
    if (post.channel === "facebook") {
      result = await publishFacebook({
        token,
        pageId: account.accountMeta?.pageId,
        message: text,
      });
    } else if (post.channel === "instagram") {
      result = await publishInstagram({
        token,
        igUserId: account.accountMeta?.igUserId,
        ver,
      });
    } else {
      unsupported(post.channel);
    }
  } catch (err) {
    const attempts = (post.publish?.attempts || 0) + 1;
    await post.updateOne({
      $set: {
        status: attempts >= 5 ? "RETRY_EXHAUSTED" : "FAILED",
        "publish.lastError": err.message,
        "publish.nextRetryAt": new Date(Date.now() + 5 * 60 * 1000),
        "publish.attempts": attempts,
      },
    });
    throw err;
  }

  const messageIds = {
    ...(post.publish?.providerMessageIds || {}),
    [post.channel]: result.messageId,
  };
  await post.updateOne({
    $set: {
      status: "PUBLISHED",
      "publish.providerMessageIds": messageIds,
      "publish.permalink": result.permalink || "",
      "publish.lastError": null,
      "publish.nextRetryAt": null,
      "workflow.publishedAt": new Date(),
    },
  });

  return { postId: String(post._id), alreadyPublished: false, ...result };
};
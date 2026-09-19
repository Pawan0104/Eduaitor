import { toast } from "react-toastify";
import { marketingApi } from "../marketingApi";
import { ActionButton } from "./bits";

/** Contextual workflow buttons for a marketing post. Calls onChanged() after each action. */
export default function WorkflowActions({ post, onChanged, compact }) {
  const id = post._id;
  const busy = async (fn, okMsg) => {
    try {
      await fn();
      toast.success(okMsg || "Done");
      onChanged?.();
    } catch (err) {
      toast.error(err?.response?.data?.message || "Action failed");
    }
  };

  const s = post.status;

  return (
    <div className="flex flex-wrap items-center gap-2">
      {s === "DRAFT" && (
        <>
          <ActionButton onClick={() => busy(() => marketingApi.submit(id), "Submitted for approval")}>
            Send for Approval
          </ActionButton>
          <ActionButton tone="danger" onClick={() => busy(() => marketingApi.discard(id), "Discarded")}>
            Discard
          </ActionButton>
        </>
      )}

      {s === "PENDING" && (
        <span className="text-[11.5px] font-bold text-amber-600">
          ⏳ Awaiting approval — open the Approvals page to review.
        </span>
      )}

      {s === "APPROVED" && (
        <>
          <ActionButton onClick={() => busy(() => marketingApi.publishNow(id), "Published!")}>
            Publish Now
          </ActionButton>
          <ActionButton tone="soft" onClick={() => onChanged?.("schedule", post)}>
            Schedule…
          </ActionButton>
        </>
      )}

      {s === "SCHEDULED" && (
        <>
          <span className="text-[11.5px] font-bold text-blue-600">
            {post.schedule?.scheduledAt ? `Scheduled ${new Date(post.schedule.scheduledAt).toLocaleString("en-IN")}` : "Scheduled"}
          </span>
          <ActionButton onClick={() => busy(() => marketingApi.publishNow(id), "Published now")}>
            Publish Now
          </ActionButton>
        </>
      )}

      {(s === "FAILED" || s === "RETRY_EXHAUSTED") && (
        <>
          <ActionButton onClick={() => busy(() => marketingApi.retry(id), "Retry sent")}>
            Retry Publish
          </ActionButton>
          <ActionButton tone="danger" onClick={() => busy(() => marketingApi.discard(id), "Discarded")}>
            Discard
          </ActionButton>
        </>
      )}

      {s === "PUBLISHED" && post.publish?.permalink && (
        <a
          href={post.publish.permalink}
          target="_blank"
          rel="noreferrer"
          className="text-[12px] font-extrabold text-blue-600 underline"
        >
          View post ↗
        </a>
      )}

      {s === "REJECTED" && post.workflow?.rejectedReason && (
        <span className="text-[11.5px] font-bold text-rose-600">
          ↳ {post.workflow.rejectedReason}
        </span>
      )}
    </div>
  );
}
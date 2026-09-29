<?php
/**
 * Eduaitor mail relay for Render → GoDaddy cPanel.
 * Upload to: public_html/mail-relay/send.php
 *
 * Auth: header X-Mail-Relay-Secret must match MAIL_RELAY_SECRET on Render.
 */
header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
  http_response_code(405);
  echo json_encode(['ok' => false, 'error' => 'Method not allowed']);
  exit;
}

$secret = getenv('MAIL_RELAY_SECRET');
if (!$secret) {
  // Fallback: same folder config file (not in git) — optional
  $cfg = __DIR__ . '/config.php';
  if (is_file($cfg)) {
    /** @noinspection PhpIncludeInspection */
    $local = include $cfg;
    if (is_array($local) && !empty($local['secret'])) {
      $secret = $local['secret'];
    }
  }
}

$provided = $_SERVER['HTTP_X_MAIL_RELAY_SECRET'] ?? '';
if (!$secret || !hash_equals((string)$secret, (string)$provided)) {
  http_response_code(401);
  echo json_encode(['ok' => false, 'error' => 'Unauthorized']);
  exit;
}

$raw = file_get_contents('php://input');
$data = json_decode($raw, true);
if (!is_array($data)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Invalid JSON']);
  exit;
}

$to = trim((string)($data['to'] ?? ''));
$subject = trim((string)($data['subject'] ?? ''));
$html = (string)($data['html'] ?? '');
$text = (string)($data['text'] ?? strip_tags($html));
$fromEmail = trim((string)($data['fromEmail'] ?? 'support@eduaitor.com'));
$fromName = trim((string)($data['fromName'] ?? 'Eduaitor'));

if ($to === '' || $subject === '' || ($html === '' && $text === '')) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'to, subject, and html/text are required']);
  exit;
}

if (!filter_var($to, FILTER_VALIDATE_EMAIL) || !filter_var($fromEmail, FILTER_VALIDATE_EMAIL)) {
  http_response_code(400);
  echo json_encode(['ok' => false, 'error' => 'Invalid email']);
  exit;
}

$fromHeader = sprintf('%s <%s>', $fromName, $fromEmail);
$boundary = 'b_' . bin2hex(random_bytes(8));

$headers = [];
$headers[] = 'MIME-Version: 1.0';
$headers[] = 'From: ' . $fromHeader;
$headers[] = 'Reply-To: ' . $fromEmail;
$headers[] = 'Content-Type: multipart/alternative; boundary="' . $boundary . '"';

$body = '';
$body .= '--' . $boundary . "\r\n";
$body .= "Content-Type: text/plain; charset=UTF-8\r\n\r\n";
$body .= $text . "\r\n";
$body .= '--' . $boundary . "\r\n";
$body .= "Content-Type: text/html; charset=UTF-8\r\n\r\n";
$body .= ($html !== '' ? $html : nl2br(htmlspecialchars($text, ENT_QUOTES, 'UTF-8'))) . "\r\n";
$body .= '--' . $boundary . "--\r\n";

$ok = @mail($to, '=?UTF-8?B?' . base64_encode($subject) . '?=', $body, implode("\r\n", $headers));

if (!$ok) {
  http_response_code(502);
  echo json_encode(['ok' => false, 'error' => 'mail() failed on hosting']);
  exit;
}

echo json_encode(['ok' => true, 'provider' => 'cpanel-mail']);

<?php
/**
 * Local secret for mail-relay (do not commit real production secret to public repos if possible).
 * Copy to public_html/mail-relay/config.php on hosting.
 */
return [
  'secret' => getenv('MAIL_RELAY_SECRET') ?: 'CHANGE_ME_TO_A_LONG_RANDOM_SECRET',
];

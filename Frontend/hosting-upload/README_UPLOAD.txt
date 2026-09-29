Eduaitor — shared hosting upload (3 apps)
========================================

1) PUT_IN_public_html_ROOT
   Upload ALL contents into:  public_html/   (www.eduaitor.com)
   = Marketing website

2) PUT_IN_public_html_admin-dashboard
   Upload ALL contents into:  public_html/admin-dashboard/
   = Website CMS admin (eduaitor.com/admin-dashboard)

3) PUT_IN_public_html_admin
   Upload ALL contents into:  public_html/admin/
   = School ERP (eduaitor.com/admin)

Replace existing files, then hard-refresh (Ctrl+F5).

Render backends (env must already include EMAIL_*):
- Website API: eduaitor-website-backend  (demo/contact mail) — pushed to Pawan0104/EduaitorWebsite
- School ERP API: eduaitor-api

After upload, set on website Render service if missing:
  EMAIL_HOST, EMAIL_PORT, EMAIL_USER, EMAIL_PASS, EMAIL_FROM
  EMAIL_TLS_REJECT_UNAUTHORIZED=false
  SUPPORT_MAIL=support@eduaitor.com

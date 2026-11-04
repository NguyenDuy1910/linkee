# Linkee

## Setup Instagram + Facebook

Links:

- Meta apps: <https://developers.facebook.com/apps>
- Instagram API with Instagram Login: <https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login>
- Instagram business login: <https://developers.facebook.com/docs/instagram-platform/instagram-api-with-instagram-login/business-login>
- Instagram webhooks: <https://developers.facebook.com/docs/instagram-platform/webhooks>
- Facebook Login for Business: <https://developers.facebook.com/docs/facebook-login/facebook-login-for-business>
- App Review: <https://developers.facebook.com/docs/app-review>
- Business verification: <https://developers.facebook.com/docs/development/release/business-verification>
- Switch to an Instagram professional account: <https://help.instagram.com/502981923235522>

Flow:

1. Create a **Business** app in Meta apps. In *App settings → Basic*, fill in the App domain,
   Privacy Policy URL and Data deletion URL, then copy the App ID/secret into
   `META_APP_ID` / `META_APP_SECRET`.
2. Add **Instagram → API setup with Instagram login**. Copy the Instagram app ID/secret into
   `INSTAGRAM_APP_ID` / `INSTAGRAM_APP_SECRET`. They are different from the Facebook ones.
   Add the redirect URI `${APP_URL}/api/social/instagram/callback`.
3. Set up **Webhooks** in the Instagram product with callback `${APP_URL}/api/webhooks/instagram`,
   verify token = `META_WEBHOOK_VERIFY_TOKEN`, and subscribe the `comments` field.
4. Add **Facebook Login for Business** with redirect URI `${APP_URL}/api/social/facebook/callback`.
5. Set `APP_URL` to the public HTTPS domain and deploy. Meta must be able to reach
   `/api/webhooks/instagram` and `/media/*` without a login.
6. Test in Development mode: add the Instagram/Facebook test accounts under *App roles*, then in
   Linkee use *Settings → Connect Instagram / Facebook Page*, then *Inbox → Refresh*.
7. Go live: complete Business verification, request **Advanced Access** in App Review for
   `instagram_business_basic`, `instagram_business_manage_comments`,
   `instagram_business_content_publish`, `pages_show_list`, `pages_read_engagement`,
   `pages_manage_posts` and `publish_video`, then switch the app to **Live**.

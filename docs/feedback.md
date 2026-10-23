# Reading feedback

Visitors use https://playsacrament.com/feedback/ to send a private message. They do not need an account or an email address.

To read messages:

1. Sign in to your Netlify account.
2. Open the Sacrament website project.
3. Open **Forms**, then **vtt-feedback**.
4. Open a submission to see its category, message and optional device/browser details. Check the spam list if an expected message is missing.

This is a private inbox in Netlify, not a public forum or a task board with development statuses. Email notifications are not required by this implementation. Existing account notification settings may still apply; review them in Netlify if you want no notifications.

Netlify form detection must remain enabled. The form is defined in `scripts/build-landing.mjs`; its introductory copy is in `content/landing/feedback.md`. The thank-you page appears after a successful native submission. The local server does not store submissions: local tests simulate the hosting service's redirect. Live verification uses a clearly labelled disposable test message and must distinguish HTTP acceptance from viewing a saved record in the private dashboard.

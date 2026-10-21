# Remove card and token image file uploads

Removed the non-working 'Or upload a picture' file selector from the GM card editor (used for both cards and tokens). The optional picture-address field remains, so existing image URLs and artwork continue to work. Existing card images are not deleted.

The background/scene image uploader is unchanged and remains available.

The now-unused card-upload branch has been removed from the shared upload handler. No multiplayer data schema, stored assets, game rules, or server functions were changed.

# Mobile file and single-QR import

<p><a href="./mobile-import.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

The desktop page always provides one `.cwr.json` WeChat import file. The fixed mini-program code only opens the companion app. A data QR appears only when the complete receipt safely fits in one code.

1. Scan the fixed mini-program code in WeChat and open the companion mini program.
2. Select “Download WeChat import file” in the desktop page.
3. Send the `.cwr.json` file to WeChat File Transfer or one of your own chats.
4. Tap “Import from chat file” in the mini program and select that file.
5. Validate the file format, version, SHA-256 digest, payload schema, and privacy-safe fields.
6. Preview the range, session count, and canonical fact count. Only deduplicate and persist after user confirmation.
7. Render the selected template on Canvas and save it to the photo library.

The mini program should use `wx.chooseMessageFile` to select the chat file and `FileSystemManager.readFile` to read it as UTF-8. It must enforce its own product size limit, validate all untrusted input, and avoid partial writes before confirmation.

## Optional single-code import

When the complete `cwr1` or `cwr2` payload safely fits in one data QR, the page offers “Or import by scanning.” The single data code replaces the mini-program code, so two scannable codes are never shown at once. New `cwr2p` multipart codes are no longer generated.

The updated mini program should continue decoding `cwr1`, `cwr2`, and historical `cwr2p` receipts for backwards compatibility.

Neither files nor QR codes transfer an image. Desktop and mobile render the same privacy-safe structured data independently. Import data excludes prompts, response text, source code, project paths, file names, and original session IDs. Sending the file to a chat explicitly uses WeChat's file-transfer system, so send it only to a chat you trust.

Saving a private receipt does not automatically join public statistics; participation in the AI Cooperative remains a separate choice.

The companion mini program is a separate product. This repository does not contain its source code, AppID, backend code, or server credentials.

See the [data schema, file, and QR protocol](data-schema.en.md). For implementation details, see [mini-program file import](miniprogram-file-import.en.md).

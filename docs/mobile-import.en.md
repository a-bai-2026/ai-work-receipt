# Mobile QR import

<p><a href="./mobile-import.md">中文</a> · <strong>English</strong> · <a href="../README.en.md">Back to README</a></p>

The desktop page shows both the fixed mini-program code and a data QR code for the current receipt. The companion mini program can complete the MVP import without a server:

1. Scan the fixed mini-program code in WeChat and open the companion mini program.
2. Tap the desktop-import action.
3. Scan the adjacent data QR code.
4. Validate the `cwr1` prefix, checksum, and schema version.
5. Decompress and parse the privacy-safe metrics.
6. Deduplicate by receipt ID and store the record in local history.
7. Render the selected template with Canvas and save it to the phone.

The QR code does not transfer an image. The desktop page and mini program independently render the same structured receipt data.

The companion mini program is a separate product. This repository does not contain its source code, AppID, backend code, or server credentials.

See the [data schema and QR protocol](data-schema.en.md).

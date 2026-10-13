// Authored learning facts and checkpoint questions. Correct option is first here;
// the assessment runtime shuffles options independently for each attempt.
const formats = [
  [
    "json",
    "JSON data",
    "Data & configuration",
    "https://www.rfc-editor.org/rfc/rfc8259",
    [
      "Which key syntax is valid in a JSON object?|\"name\"|name|'name'|`name`",
      "Which value is valid JSON?|null|undefined|NaN|Infinity",
      "What separates elements in a JSON array?|Comma|Semicolon|Tab only|Colon",
      "Why does a trailing comma fail strict JSON parsing?|The grammar does not permit it|Arrays cannot hold numbers|Keys must be numeric|All whitespace is forbidden",
      "How should interoperable JSON sent between systems be encoded?|UTF-8|Platform-native encoding only|UTF-16 always|ASCII with no escapes allowed",
    ],
  ],
  [
    "jsonl",
    "JSON Lines",
    "Data & configuration",
    "https://jsonlines.org/",
    [
      "What does each nonblank line in JSON Lines contain?|One valid JSON value|One object property only|An XML element|A CSV header",
      "Why is JSON Lines useful for streaming?|Records can be processed one line at a time|It needs the whole file in memory|It has no record boundaries|It encrypts each record",
      "How is a newline inside a JSON Lines string represented?|An escaped newline within the JSON string|A literal line break inside quotes|An HTML br element|A blank separator line",
      "Is a blank line a valid JSON Lines record?|No; it is not a JSON value|Yes; it always means null|Yes; it means an empty object|Yes; it closes the array",
      "What character encoding does JSON Lines require?|UTF-8|UTF-16 only|EBCDIC|Any unspecified locale",
    ],
  ],
  [
    "csv",
    "CSV table",
    "Data & configuration",
    "https://www.rfc-editor.org/rfc/rfc4180",
    [
      "In RFC 4180 CSV, how is a field containing a comma represented?|Enclose it in double quotes|Replace commas with tabs unconditionally|Surround it with braces|Delete its commas",
      "How is a quote escaped inside a quoted CSV field?|Double the quote|Use an HTML entity|Use a backtick|Remove it",
      "Does RFC 4180 require a header row in CSV?|No; the header is optional|Yes; exactly two headers|Only for numeric fields|Only for empty files",
      "Can a quoted CSV field contain a line break?|Yes|Never|Only after the final row|Only in the header",
      "Why can splitting CSV text on commas corrupt data?|Quoted fields can contain commas|CSV has no fields|Every comma is a row break|CSV is necessarily binary",
    ],
  ],
  [
    "yaml",
    "YAML configuration",
    "Data & configuration",
    "https://yaml.org/spec/1.2.2/",
    [
      "What establishes block nesting in YAML?|Indentation with spaces|HTML tags|Parentheses only|A mandatory END keyword",
      "What starts a block-sequence entry in YAML?|A dash followed by separation|An equals sign|A percent sign|A closing brace",
      "What does an alias such as *defaults refer to in YAML?|A previously anchored node|An environment variable automatically|A filesystem symlink|A comment",
      "What does the YAML literal block indicator preserve?|Line breaks in the scalar|Only numeric digits|No whitespace at all|Only the first line",
      "Why quote a YAML scalar that resembles a boolean?|To preserve its string interpretation|To enable compression|To create an anchor|To make a sequence",
    ],
  ],
  [
    "toml",
    "TOML configuration",
    "Data & configuration",
    "https://toml.io/en/v1.0.0",
    [
      "How is a TOML table header written?|[server]|<server>|{server:}|server()",
      "Which separator joins a TOML key and value?|Equals sign|Arrow|Semicolon|Question mark",
      "What does [[products]] declare in TOML?|An array of tables|A comment block|A regular expression|An encrypted string",
      "What begins a TOML comment outside a string?|Hash sign|Double slash|XML comment tag|Backslash",
      "Can a TOML key be defined twice in the same table?|No; duplicate definitions are invalid|Yes; last value always wins|Yes; values are summed|Only if both are strings",
    ],
  ],
  [
    "xml",
    "XML document",
    "Data & configuration",
    "https://www.w3.org/TR/xml/",
    [
      "How many root elements does a well-formed XML document have?|One|Zero mandatory roots|Exactly two|Any number of sibling roots",
      "How is a literal ampersand represented in XML text?|&amp;|&&|\\&|%26",
      "Are XML element names case-sensitive?|Yes|No|Only in attributes|Only in comments",
      "What must happen to nested XML elements?|They must close in reverse nesting order|They may overlap arbitrarily|They must all be empty|They must have identical names",
      "What does an XML namespace distinguish?|Names from different vocabularies|Compression levels|File permissions|Numeric precision",
    ],
  ],
  [
    "html",
    "HTML document",
    "Web & source",
    "https://html.spec.whatwg.org/multipage/",
    [
      "What does the HTML doctype primarily select in modern browsers?|Standards-mode rendering|A JavaScript version|A CSS framework|A network protocol",
      "Which HTML element is appropriate for a clickable form action?|button|div without behavior|span without behavior|meta",
      "Why associate an HTML label with its input?|To provide an accessible name and larger activation target|To encrypt its value|To disable validation|To hide its value",
      "What is the purpose of alt text on an informative HTML image?|A text alternative for its meaning|A mandatory tooltip|A download filename|A CSS class",
      "Does renaming a text file to .html validate its markup?|No; validity depends on the content|Yes; the extension fixes errors|Yes; browsers add all semantics|Only on Linux",
    ],
  ],
  [
    "css",
    "CSS stylesheet",
    "Web & source",
    "https://www.w3.org/TR/css-cascade-5/",
    [
      "What resolves competing CSS declarations before specificity is considered?|Cascade origin and importance|Alphabetical property order|File extension length|Selector spelling length",
      "What does CSS inheritance generally copy?|A property value from the parent when the property inherits|Every descendant rule|Every sibling style|Only inline styles",
      "Which CSS notation references a custom property?|var(--accent)|$accent|@accent()|env.accent",
      "Does a more specific CSS selector always beat an important declaration?|No; importance is considered first|Yes; specificity always wins|Only for color|Only outside media queries",
      "What does a CSS cascade layer control?|Priority among grouped rules within an origin|Network cache lifetime|DOM ancestry|Image resolution",
    ],
  ],
  [
    "js",
    "JavaScript source",
    "Web & source",
    "https://tc39.es/ecma262/",
    [
      "Which JavaScript declaration is block-scoped?|let|var|A global property always|A function argument in another function",
      "What does a JavaScript async function return?|A Promise|Always a string|A raw thread|Always undefined",
      "What does strict equality avoid in JavaScript?|Type coercion before comparison|Object identity comparisons|Comparing numbers|Comparing strings",
      "Can a const-bound JavaScript object still have mutable properties?|Yes; const prevents rebinding|No; const recursively freezes it|Only in a browser|Only before import",
      "What happens when JSON.parse receives invalid JSON in JavaScript?|It throws a SyntaxError|It always returns null|It evaluates it as code|It silently repairs it",
    ],
  ],
  [
    "ts",
    "TypeScript source",
    "Web & source",
    "https://www.typescriptlang.org/docs/handbook/2/everyday-types.html",
    [
      "What happens to most TypeScript type annotations during compilation?|They are erased|They become runtime validators|They encrypt values|They become database constraints",
      "Which TypeScript type requires narrowing before most operations?|unknown|any|never as a value|A string literal",
      "Does a TypeScript type assertion validate network data at runtime?|No|Yes; always|Only in production|Only for interfaces",
      "What is a TypeScript union such as string or number intended to express?|A value may be either member type|A value must be both primitives simultaneously|Two variables are created|A tuple always has two entries",
      "What makes optional TypeScript properties different from required ones?|They may be absent|They must be null|They cannot be read|They are always readonly",
    ],
  ],
  [
    "tsx",
    "TypeScript with JSX",
    "Web & source",
    "https://www.typescriptlang.org/docs/handbook/jsx.html",
    [
      "What syntax does a .tsx file permit beyond ordinary .ts source?|JSX expressions|SQL transactions|Shell pipelines|Python decorators",
      "Why use as for a type assertion in TSX?|Angle-bracket assertions conflict with JSX syntax|It validates JSON|It avoids all compilation|It converts every value to a string",
      "What does the TypeScript jsx compiler option control?|How JSX is emitted or preserved|CSS selector priority|Browser cache headers|Database query plans",
      "Does TSX source normally run directly in a browser without transformation?|No; types and JSX generally need transformation|Yes; all browsers parse it natively|Only if it contains a component|Only in private mode",
      "What commonly distinguishes a component name from an intrinsic JSX element?|A capitalized identifier versus a lowercase tag|Its filename length|The number of props|Its export order",
    ],
  ],
  [
    "py",
    "Python source",
    "Web & source",
    "https://docs.python.org/3/reference/",
    [
      "What delimits a Python suite after a colon?|Indentation|Curly braces|An end keyword|A semicolon alone",
      "What does def create in Python?|A function|A database table|A package archive|A static type check",
      "What does a with statement manage in Python?|A context with entry and exit behavior|Only an infinite loop|Only imports|Only string interpolation",
      "What does yield make a Python function produce when called?|A generator|An immediate list of every result|A new OS process|A class definition",
      "Does a Python type annotation enforce types by itself at runtime?|No|Yes; on every assignment|Only for lists|Only inside classes",
    ],
  ],
  [
    "sql",
    "SQL script",
    "Data & configuration",
    "https://www.postgresql.org/docs/current/sql.html",
    [
      "Which SQL clause filters rows before grouping?|WHERE|HAVING|ORDER BY|LIMIT",
      "How should SQL queries receive untrusted user values?|Bound parameters|String concatenation|Removing spaces only|Uppercasing the input",
      "What does SQL IS NULL test?|Whether a value is null|Whether a string is empty|Whether a number is zero|Whether a row is duplicated",
      "What can happen if UPDATE has no WHERE clause?|All rows can be updated|Only the first row changes|The query is always rejected|Only null rows change",
      "Why might a .sql script fail on another database engine?|SQL dialects and extensions differ|All engines share identical syntax|File extensions enforce portability|Queries require the same CPU",
    ],
  ],
  [
    "svg",
    "SVG vector image",
    "Images & 3D",
    "https://www.w3.org/TR/SVG2/",
    [
      "What primarily represents graphics inside an SVG file?|XML elements describing shapes|Only a fixed pixel array|MP3 frames|SQL statements",
      "What does an SVG viewBox establish?|A user-space rectangle mapped to the viewport|An encryption key|A fixed file size|A mandatory pixel density",
      "Why can an SVG icon scale cleanly?|Its vector geometry can be rerendered|It stores every possible image size|It disables antialiasing|It is always a bitmap",
      "Why treat an untrusted SVG document as active content?|It can contain scripts or external references|It is always encrypted|It has no markup|It cannot be parsed",
      "Which SVG element describes arbitrary connected curves and segments?|path|table|audio|script as geometry",
    ],
  ],
  [
    "png",
    "PNG raster image",
    "Images & 3D",
    "https://www.w3.org/TR/png/",
    [
      "Is standard PNG image compression lossless?|Yes|No; always lossy|Only when renamed|Only for photographs",
      "What can a PNG alpha channel represent?|Pixel transparency|An audio track|A document password|Vector paths",
      "What is a PNG chunk used for?|A typed portion of image data or metadata|An SQL row|A JavaScript closure|A filesystem permission",
      "Will renaming a JPEG to .png convert its encoded pixels?|No; actual decoding and encoding are needed|Yes; the extension transcodes it|Only on macOS|Only below one megabyte",
      "Why can a simple logo compress well as PNG?|Repeated pixel patterns compress efficiently|Every logo becomes a vector|PNG removes all colors|PNG always downsamples images",
    ],
  ],
  [
    "webp",
    "WebP image",
    "Images & 3D",
    "https://developers.google.com/speed/webp/docs/riff_container",
    [
      "Which compression modes can WebP support?|Lossy and lossless|Only uncompressed|Only lossy|Only lossless",
      "What container structure does WebP use?|RIFF|ZIP|Ogg|MPEG transport stream",
      "Can WebP store transparency?|Yes|No|Only in filenames|Only as an external CSS rule",
      "Can a WebP file contain animation?|Yes; the extended format supports it|No; never|Only after renaming to GIF|Only as a PDF attachment",
      "Why inspect WebP feature flags before processing it?|The file may use animation or alpha features|All WebP files have one mandatory frame|Its extension proves its dimensions|The flags are encryption passwords",
    ],
  ],
  [
    "gltf",
    "glTF scene",
    "Images & 3D",
    "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html",
    [
      "What does a .gltf asset primarily describe?|A 3D scene using JSON|Only a compressed audio stream|An SQL schema|A browser stylesheet",
      "Where may a glTF buffer store binary data?|An external URI or embedded data URI|Only inside a CSS selector|Only in a database|Only in its filename",
      "What do glTF accessors describe?|Typed views of attribute or index data|Login passwords|HTTP caches|Screen brightness",
      "What do glTF nodes provide?|A scene hierarchy with transforms|Only texture pixels|Audio sample clocks|File-system owners",
      "Why package external files with a .gltf document?|Its buffers and images may reference those files|JSON automatically contains every asset|The extension downloads missing files safely|The model requires its source editor",
    ],
  ],
  [
    "glb",
    "Binary glTF",
    "Images & 3D",
    "https://registry.khronos.org/glTF/specs/2.0/glTF-2.0.html#glb-file-format-specification",
    [
      "What does a GLB container combine?|glTF JSON and optional binary data chunks|Only PNG images|A SQL database and its logs|Only JavaScript source",
      "Which byte-order is used for GLB header integers?|Little-endian|Big-endian|Text decimal|Host-dependent only",
      "What is the first GLB chunk required to contain?|JSON scene description|An MP3 stream|A shell script|A JPEG thumbnail",
      "Does the .glb extension alone prove that an asset is self-contained?|No; inspect any external resource references|Yes; always|Only on Windows|Only with an animation",
      "What boundary is used for GLB chunk alignment?|Four bytes|One kilobyte|One bit|One megabyte",
    ],
  ],
  [
    "parquet",
    "Parquet dataset",
    "Data & configuration",
    "https://parquet.apache.org/docs/file-format/",
    [
      "How is Parquet primarily organized?|Column-oriented storage|Only plain-text rows|Pixel tiles|Executable bytecode",
      "Why does Parquet help queries that read few columns?|Readers can avoid unrelated column data|It eliminates every disk read|It executes SQL itself|It stores no schema",
      "What does a Parquet row group contain?|Column chunks for a group of rows|Only one JSON string|Only one image|Only table permissions",
      "Where is Parquet file metadata normally located?|In the footer|Only in the filename|In an external mandatory XML file|In HTTP cookies",
      "How can Parquet statistics help selective queries?|They can let readers skip irrelevant data groups|They guarantee all predicates match|They replace decompression universally|They remove the need to validate results",
    ],
  ],
  [
    "arrow",
    "Arrow IPC file",
    "Data & configuration",
    "https://arrow.apache.org/docs/format/Columnar.html",
    [
      "What does Arrow standardize for analytical data?|A language-independent columnar memory layout|A SQL query language|A network firewall|A model license",
      "What does an Arrow validity bitmap describe?|Which array elements are null|File encryption keys|Query costs|Image transparency",
      "How are variable-length Arrow values located?|Using offsets into a data buffer|By parsing commas|Only through filenames|By fixed one-byte slots always",
      "What is an Arrow record batch?|Equal-length arrays conforming to a schema|An audio playlist|A Java class file|An archive password",
      "What is a benefit of Arrow zero-copy access where supported?|Avoiding unnecessary data-buffer copies|Eliminating all memory use|Automatically validating business rules|Compressing every value to one bit",
    ],
  ],
  [
    "safetensors",
    "SafeTensors weights",
    "AI model files",
    "https://huggingface.co/docs/safetensors/index",
    [
      "What is stored in a SafeTensors file?|Tensor data and metadata|An arbitrary Python program|Only token strings|Only API credentials",
      "Why prefer SafeTensors over arbitrary pickle checkpoints?|Its format avoids pickle-style code execution|It guarantees accurate models|It grants commercial rights|It removes all memory limits",
      "Does SafeTensors store an entire model architecture implementation?|No; separate model code/configuration is still needed|Yes; always|Only for vision models|Only for text models",
      "What do tensor offsets identify in SafeTensors?|Byte ranges in the data buffer|GPU device IDs|Training epochs|Model license versions",
      "Does loading a SafeTensors file make all surrounding model code trustworthy?|No; code and dependencies still need review|Yes; the extension certifies them|Only when downloaded over HTTPS|Only for small models",
    ],
  ],
  [
    "gguf",
    "GGUF model file",
    "AI model files",
    "https://github.com/ggml-org/ggml/blob/master/docs/gguf.md",
    [
      "What does GGUF package for inference tooling?|Tensors and model metadata|Only Python source|Only an HTTP endpoint|Only a chat history",
      "Does a GGUF extension imply one specific quantization precision?|No; inspect tensor types and metadata|Yes; always four bits|Yes; always sixteen bits|Yes; always one bit",
      "What must an inference engine support to run a GGUF model?|The model architecture and tensor types|Only the filename|Only the download website|Only UTF-8 text",
      "Why can two GGUF files for one model need different memory?|Their quantization and tensor storage can differ|Their licenses change RAM capacity|Their filenames allocate memory|GGUF always has fixed size",
      "What does GGUF metadata help a loader determine?|Architecture-specific configuration and tokenizer details|A guaranteed benchmark score|A guaranteed safe system prompt|A commercial-use exemption",
    ],
  ],
  [
    "onnx",
    "ONNX model",
    "AI model files",
    "https://onnx.ai/onnx/intro/concepts.html",
    [
      "What does ONNX represent?|A computational graph and associated data|Only a chat template|An operating system image|Only CSV records",
      "What does an ONNX opset version specify?|Versions of operator definitions|GPU memory size|Model market price|File access permissions",
      "Why might a valid ONNX model fail in a particular runtime?|The runtime may not support required operators|All runtimes support every operator|ONNX always needs Python pickle|Its extension sets the wrong CPU speed",
      "Can ONNX tensor data be stored externally for large models?|Yes; external data is supported|No; never|Only as SVG|Only in browser cookies",
      "Why validate numerical outputs after ONNX conversion?|Conversion or operator differences can change behavior|The filename validates accuracy|All conversions are bit-identical|ONNX guarantees task quality",
    ],
  ],
  [
    "ipynb",
    "Jupyter notebook",
    "AI model files",
    "https://nbformat.readthedocs.io/en/latest/format_description.html",
    [
      "What is the underlying representation of an .ipynb file?|JSON|JPEG|ELF|MP3",
      "Which content can notebook code cells retain?|Source and execution outputs|Only prose|Only filenames|Only environment variables",
      "Why can notebook execution counts be out of order?|Cells can be executed nonsequentially|Counts are always random|JSON requires descending order|Markdown resets the kernel",
      "Why review notebook outputs before sharing?|They may contain sensitive data|Outputs are always encrypted|Outputs cannot contain text|Sharing strips all outputs automatically",
      "What helps check notebook reproducibility?|Restart the kernel and run cells in order|Rename the file|Trust all existing outputs|Delete only markdown cells",
    ],
  ],
  [
    "zip",
    "ZIP archive",
    "Archives & packages",
    "https://pkware.cachefly.net/webdocs/casestudies/APPNOTE.TXT",
    [
      "What is a ZIP archive used to hold?|Multiple file entries and metadata|Only one raw audio signal|Only a SQL table|Only vector paths",
      "Does every ZIP entry have to be compressed?|No; stored entries are allowed|Yes; always|Only images may be stored|Only zero-byte files may be stored",
      "What does the ZIP central directory describe?|Archive entries and their locations|A DNS server|A CPU cache|A browser tab list",
      "Why validate extraction paths in an untrusted ZIP?|Entries may try to escape the destination directory|All paths are guaranteed safe|Filenames cannot contain separators|ZIP always sandboxes extraction",
      "Why limit expanded ZIP size during extraction?|Small archives can expand to excessive resource use|Compression always increases size|ZIP files cannot contain repetition|Only encrypted archives consume memory",
    ],
  ],
  [
    "gz",
    "Gzip compressed data",
    "Archives & packages",
    "https://www.rfc-editor.org/rfc/rfc1952",
    [
      "What is gzip primarily designed to provide?|Lossless compression of a data stream|A multi-file directory tree by itself|A public-key signature|A SQL engine",
      "Why is tar often combined with gzip?|Tar groups files while gzip compresses the stream|Both are required to read JSON|Gzip supplies file permissions to tar|Tar encrypts gzip passwords",
      "What compression method is used by standard gzip?|DEFLATE|JPEG DCT|MP3|H.264",
      "Does a gzip checksum authenticate the sender?|No; error detection is not authentication|Yes; it proves identity|Only for text files|Only over HTTPS",
      "Will renaming an uncompressed file to .gz compress it?|No|Yes|Only below four gigabytes|Only on Unix",
    ],
  ],
  [
    "wasm",
    "WebAssembly module",
    "Web & source",
    "https://webassembly.github.io/spec/core/",
    [
      "What does a .wasm file normally contain?|A binary WebAssembly module|Only JavaScript source|Only HTML markup|A native OS driver",
      "How does a WebAssembly module access host functionality?|Through explicitly provided imports|By automatically reading every host file|By bypassing browser permissions|By directly opening arbitrary sockets always",
      "What is WebAssembly linear memory?|A contiguous byte-addressable memory abstraction|A CSS layout tree|A filesystem directory|A GPU texture only",
      "Does WebAssembly validation prove a program is logically correct?|No; type/safety checks do not prove its intended result|Yes; every validated module is correct|Only for arithmetic|Only for modules without imports",
      "Why must a host inspect the imports a WASM module requests?|Host capabilities determine its accessible operations|Imports are always harmless comments|Imports control only filenames|Every import is a type annotation",
    ],
  ],
  [
    "proto",
    "Protocol Buffers schema",
    "Data & configuration",
    "https://protobuf.dev/programming-guides/proto3/",
    [
      "What does a .proto file define?|Message schemas and optionally services|Only binary message instances|Only SQL indexes|Only a network packet capture",
      "What identifies a field in the protobuf wire format?|Its field number|Only its display name|Its source line number|Its comment length",
      "Why reserve deleted protobuf field numbers?|To avoid incompatible reuse|To reduce source indentation|To encrypt messages|To force alphabetical order",
      "Does a .proto schema itself contain the serialized application data?|No; it describes the structure|Yes; all data is embedded|Only on Windows|Only for integers",
      "What is a repeated protobuf field intended to represent?|Zero or more values|Exactly one mandatory value|An encryption key|A recursive import",
    ],
  ],
  [
    "md",
    "Markdown document",
    "Documents",
    "https://spec.commonmark.org/0.31.2/",
    [
      "What is Markdown primarily used to author?|Readable text with lightweight formatting|Only binary model weights|Only audio samples|Only database indexes",
      "What do backtick fences commonly delimit in Markdown?|Code blocks|Required passwords|Image pixels|Table schemas only",
      "What does a Markdown link pair a label with?|A destination|A CPU register|A mandatory local file only|A stylesheet property",
      "Why can Markdown render differently between tools?|Dialects and extensions differ|All renderers are identical|Filenames determine every style|Markdown is never parsed",
      "Why sanitize HTML when rendering untrusted Markdown?|Some renderers allow embedded HTML|Markdown always encrypts HTML|Every link is local|Code fences validate scripts",
    ],
  ],
  [
    "pdf",
    "PDF document",
    "Documents",
    "https://opensource.adobe.com/dc-acrobat-sdk-docs/pdfstandards/PDF32000_2008.pdf",
    [
      "What is a key purpose of PDF?|Preserving a document page presentation|Executing SQL on a server|Defining a model tokenizer|Storing only unformatted text",
      "Does a scanned PDF necessarily contain searchable text?|No; it may contain only page images|Yes; every PDF has text|Only when renamed|Only below ten pages",
      "What can embedded PDF fonts help preserve?|Glyph appearance across devices|Network authentication|Audio volume|Database relationships",
      "Why inspect untrusted PDF attachments and actions?|PDF can contain more than passive page graphics|PDF is always plain text|PDF cannot contain links|The extension guarantees safety",
      "What do PDF tags help describe?|Logical document structure for accessibility|Only encryption strength|Only file size|Only printer ink levels",
    ],
  ],
];

// Each row supplies five separately testable obligations, permissions or limits.
const licenses = [
  [
    "mit",
    "MIT License",
    "https://spdx.org/licenses/MIT.html",
    [
      "Does MIT require modified software to use MIT when redistributed?|No; it is permissive|Yes; always|Only when sold|Only when hosted",
      "What notice must accompany MIT software copies or substantial portions?|Copyright and permission notice|A paid support contract|Every contributor resume|A warranty certificate",
      "Does MIT prohibit commercial use?|No|Yes; all commercial use|Only SaaS|Only mobile apps",
      "What warranty does the MIT text provide?|No warranty under its disclaimer|Guaranteed fitness|Guaranteed security|Lifetime support",
      "Does MIT explicitly name a patent grant like Apache-2.0 does?|No|Yes; the same detailed clause|Only for models|Only for binaries",
    ],
  ],
  [
    "apache_2",
    "Apache License 2.0",
    "https://www.apache.org/licenses/LICENSE-2.0",
    [
      "What extra intellectual-property permission is explicit in Apache-2.0?|A contributor patent license|A blanket trademark license|Ownership of all contributions|Exclusive resale rights",
      "When distributing modified Apache-2.0 files, what must they carry?|Prominent notices that they were changed|Only a new filename|A new patent application|A paid certificate",
      "How must a relevant Apache NOTICE file be handled on redistribution?|Preserve the applicable attribution notices|Always delete it|Replace it with a password|Convert it to executable code",
      "Does Apache-2.0 generally grant rights to use contributor trademarks?|No; trademark rights are excluded except limited descriptive use|Yes; unrestricted branding|Only for paid users|Only for AI models",
      "What can happen if a licensee brings specified patent litigation under Apache-2.0?|The patent license can terminate|Copyright ownership transfers|The software becomes public domain|All competitors lose access",
    ],
  ],
  [
    "bsd_2",
    "BSD 2-Clause License",
    "https://spdx.org/licenses/BSD-2-Clause.html",
    [
      "What broad licensing style does BSD-2-Clause use?|Permissive|Network copyleft|Noncommercial-only|No-derivatives-only",
      "What must BSD-2-Clause source redistributions retain?|Copyright notice, conditions and disclaimer|Only the project logo|A paid subscription|A new trademark",
      "Where must BSD-2-Clause binary redistributions reproduce required notices?|Documentation or other supplied materials|Only the binary filename|Nowhere|Only a private email",
      "Does BSD-2-Clause require publishing modified source merely because binaries are distributed?|No|Yes; always|Only for Linux|Only for Python",
      "Does BSD-2-Clause promise suitability for a particular purpose?|No; the disclaimer excludes that warranty|Yes; for every purpose|Only for commercial users|Only for original code",
    ],
  ],
  [
    "bsd_3",
    "BSD 3-Clause License",
    "https://spdx.org/licenses/BSD-3-Clause.html",
    [
      "What additional clause distinguishes BSD-3-Clause from BSD-2-Clause?|A non-endorsement restriction|A network source-sharing clause|A commercial-use ban|A mandatory patent fee",
      "Can you use a contributor name to endorse a BSD-3-Clause derivative without permission?|No|Yes; always|Only in advertisements|Only for free products",
      "What must BSD-3-Clause source redistributions retain?|Copyright, conditions and disclaimer|Only the new author name|Only a download URL|Only build instructions",
      "Does BSD-3-Clause generally allow proprietary derivatives?|Yes; comply with its conditions|No; every derivative must be BSD|Only for education|Only as SaaS",
      "Does BSD-3-Clause guarantee that software is defect-free?|No|Yes|Only if unmodified|Only for source distributions",
    ],
  ],
  [
    "gpl_3",
    "GNU GPL v3",
    "https://spdx.org/licenses/GPL-3.0-only.html",
    [
      "What is central to GPLv3 when conveying covered modified software?|Preserving recipients’ GPL freedoms|Prohibiting all sales|Requiring a cloud account|Deleting all notices",
      "Does GPLv3 forbid charging for copies?|No|Yes; always|Only for binaries|Only for modified copies",
      "What accompanies conveyed object code under an applicable GPLv3 compliance route?|Access to Corresponding Source as required|Only a screenshot|Only a license name|Only benchmark scores",
      "Does private modification alone generally require public source release under GPLv3?|No|Yes; every edit|Only on macOS|Only when compiled",
      "Is ordinary network interaction by itself treated like conveying a copy under GPLv3?|No; AGPL adds a separate network condition|Yes; always|Only for HTML|Only for local networks",
    ],
  ],
  [
    "agpl_3",
    "GNU AGPL v3",
    "https://spdx.org/licenses/AGPL-3.0-only.html",
    [
      "What scenario does AGPLv3 section 13 specifically address?|Users interacting remotely with a modified program over a network|Only offline printing|Only trademark registration|Only CPU benchmarking",
      "What opportunity must qualifying remote users of modified AGPL software receive?|To obtain its Corresponding Source|To obtain every unrelated database record|To buy a mandatory subscription|To rename the project",
      "Does AGPLv3 prohibit commercial hosting?|No; comply with its obligations|Yes; always|Only for small firms|Only for public clouds",
      "Does AGPLv3 automatically place every unrelated program on a server under AGPL?|No; scope depends on the covered work and combination|Yes; the entire server always|Only its operating system|Only its network drivers",
      "Why review modifications before deploying an AGPL service?|Network source-offer obligations may apply|AGPL never mentions networks|Hosting cancels the license|All source offers are optional",
    ],
  ],
  [
    "mpl_2",
    "Mozilla Public License 2.0",
    "https://www.mozilla.org/en-US/MPL/2.0/",
    [
      "What copyleft scope is commonly associated with MPL-2.0?|Covered source files|Every file on a disk|All software on the internet|Only project names",
      "Can MPL-covered files be combined with separate proprietary files in a larger work?|Yes; satisfy the covered-file obligations|No; never|Only without compilation|Only for unpaid users",
      "When distributing modified MPL-covered source, which license applies to those covered files?|MPL-2.0 subject to its terms|Any license with no conditions|No license at all|Only a trademark license",
      "What must executable-form recipients be told about MPL-covered source?|How to obtain the source under the required terms|Only the executable checksum|Only the author birthday|Only the programming language",
      "Does MPL-2.0 grant unrestricted rights to contributor trademarks?|No|Yes|Only for binaries|Only for commercial users",
    ],
  ],
  [
    "cc_by_4",
    "CC BY 4.0",
    "https://creativecommons.org/licenses/by/4.0/",
    [
      "What is central to CC BY 4.0 reuse?|Appropriate attribution|A noncommercial-only restriction|A total adaptation ban|A mandatory subscription",
      "Does CC BY 4.0 permit commercial reuse?|Yes; comply with the license|No|Only printed copies|Only unchanged images",
      "What should you disclose when sharing adapted CC BY material?|That changes were made|That you own all original rights|That the author endorses you|That the license is void",
      "Does CC BY 4.0 require an adaptation to use the same license?|No; ShareAlike is not part of BY alone|Yes; always|Only for text|Only for online use",
      "Does CC BY clear every privacy or publicity right in the material?|No; additional rights may matter|Yes; automatically|Only for photos|Only when attributed",
    ],
  ],
  [
    "cc_by_sa_4",
    "CC BY-SA 4.0",
    "https://creativecommons.org/licenses/by-sa/4.0/",
    [
      "What does ShareAlike add to CC BY-SA 4.0?|Conditions on the license of shared adaptations|A ban on all commercial use|A ban on attribution|A mandatory registration fee",
      "Can CC BY-SA 4.0 material be reused commercially?|Yes; comply with attribution and other terms|No; never|Only in academia|Only if unmodified forever",
      "What must be acknowledged when sharing CC BY-SA material?|Appropriate attribution and license information|Only the file extension|Only the distributor name|Only the upload date",
      "Does a collection automatically become one adaptation of every included CC BY-SA work?|No; collection and adaptation are different concepts|Yes; always|Only on mobile|Only in a ZIP",
      "May a distributor add effective restrictions that prevent licensed CC BY-SA freedoms?|No|Yes; without limits|Only through DRM|Only through passwords",
    ],
  ],
  [
    "cc_by_nc_4",
    "CC BY-NC 4.0",
    "https://creativecommons.org/licenses/by-nc/4.0/",
    [
      "What use condition distinguishes CC BY-NC 4.0 from CC BY?|NonCommercial|ShareAlike|NoDerivatives|Patent retaliation",
      "Does a nonprofit organization automatically make every use noncommercial?|No; the nature of the use matters|Yes; always|Only online|Only for photographs",
      "What remains required for permitted CC BY-NC sharing?|Attribution and license information|No attribution|A software warranty|A patent assignment",
      "Does CC BY-NC itself forbid all adaptations?|No; NC is not ND|Yes; every edit is banned|Only text edits|Only translations",
      "What should a business do if a desired use exceeds CC BY-NC permission?|Seek separate permission or choose another work|Assume attribution overrides NC|Remove the license|Rename the file",
    ],
  ],
  [
    "cc0",
    "CC0 1.0",
    "https://creativecommons.org/publicdomain/zero/1.0/",
    [
      "What is CC0 designed to do?|Waive copyright and related rights as far as possible|Require ShareAlike|Ban commercial use|Grant all trademarks",
      "Why does CC0 include a fallback license?|A waiver may not fully work in every jurisdiction|To require a fee|To prevent copying|To impose a password",
      "Does CC0 itself require attribution as a copyright license condition?|No|Yes; always|Only for commercial use|Only for online use",
      "Does CC0 necessarily clear patent and trademark rights?|No|Yes; universally|Only after download|Only when modified",
      "Should CC0 material be assumed free from all privacy constraints?|No; other rights can still matter|Yes; all constraints vanish|Only for datasets|Only when anonymous",
    ],
  ],
  [
    "llama2",
    "Llama 2 Community License",
    "https://huggingface.co/meta-llama/Llama-2-7b/blob/main/LICENSE.txt",
    [
      "What kind of terms govern original Llama 2 weights?|A custom community license|MIT with no other terms|Public domain dedication|GPLv3 automatically",
      "Does downloadable Llama 2 access imply unrestricted use?|No; the license and acceptable-use terms apply|Yes; downloads erase restrictions|Only for Python|Only for local inference",
      "What must a Llama 2 redistributor review beyond a license label?|The actual redistribution and attribution terms|Only the model size|Only its benchmark rank|Only the GPU brand",
      "What does the Llama 2 license say about certain very large services?|A 700 million monthly-active-user threshold can require a separate license|Every service must have 700 million users|All enterprise use is forbidden|User counts never matter",
      "Does Llama 2 permission automatically govern every later Llama version?|No; read the version-specific agreement|Yes; all future versions inherit it|Only the next minor version|Only text models",
    ],
  ],
  [
    "llama33",
    "Llama 3.3 Community License",
    "https://huggingface.co/meta-llama/Llama-3.3-70B-Instruct/blob/main/LICENSE",
    [
      "Is Llama 3.3 simply licensed under Apache-2.0?|No; it has a custom community agreement|Yes|Only for quantized files|Only for local use",
      "Which attribution phrase is specified for qualifying Llama 3.3 products or services?|Built with Llama|Certified by Meta|Official Meta product|Public domain AI",
      "What other policy is incorporated into the Llama 3.3 agreement?|Acceptable Use Policy|A mandatory GPU warranty|A paid app-store agreement|A universal privacy waiver",
      "Can quantizing Llama 3.3 weights remove their license obligations?|No|Yes; every quantization resets rights|Only below four bits|Only for GGUF",
      "Why check the Llama 3.3 large-user clause before deployment?|Certain services above the specified threshold need separate permission|Every service is exempt|The clause only affects filenames|It sets minimum GPU memory",
    ],
  ],
  [
    "gemma",
    "Gemma Terms of Use",
    "https://ai.google.dev/gemma/terms",
    [
      "Are Gemma model terms identical to an Apache-2.0 code license?|No; model terms must be checked separately|Yes; always|Only for quantized models|Only after acceptance",
      "What accompanies Gemma redistribution under its terms?|Required notices and a copy of the agreement|Only a model screenshot|Only a new name|Only a benchmark table",
      "Which policy constrains prohibited Gemma uses?|The incorporated prohibited-use policy|Only local file permissions|Only a GPU driver policy|Only a naming convention",
      "Does Gemma’s weight availability mean every downstream use is approved?|No|Yes|Only when offline|Only when free of charge",
      "Why review derivative definitions in Gemma terms?|Fine-tuning or other derivative work may retain obligations|Derivatives are always public domain|Renaming always removes restrictions|Only original filenames are covered",
    ],
  ],
  [
    "health_ai",
    "Health AI Developer Foundations terms",
    "https://developers.google.com/health-ai-developer-foundations/terms",
    [
      "Do Health AI model terms by themselves establish clinical approval?|No|Yes; for all jurisdictions|Only for small models|Only for free use",
      "Where should permissions for a MedGemma model be checked?|Its linked Health AI terms and model documentation|Only generic Apache text|Only a social media post|Only the filename",
      "Does access to a Health AI model replace professional validation?|No|Yes; validation is automatic|Only for text inputs|Only for local inference",
      "Why inspect redistribution obligations for Health AI derivatives?|Custom terms can remain applicable downstream|All derivatives lose their license|Only model size matters|Only the upload date matters",
      "What should a developer distinguish for a Health AI deployment?|License permission versus regulatory and clinical suitability|File extension versus font choice|GPU color versus model name|Download count versus copyright ownership",
    ],
  ],
  [
    "model_terms",
    "Model licensing and upstream terms",
    "https://huggingface.co/docs/hub/repositories-licenses",
    [
      "Does an open-weight model necessarily have an unrestricted open-source license?|No|Yes|Only above 70B|Only when hosted publicly",
      "Why check the base model when licensing a fine-tune?|Upstream obligations may still apply|Fine-tuning always erases upstream rights|Base models never have licenses|Only parameter count matters",
      "If model code is MIT, are the weights necessarily MIT too?|No; assets can have separate terms|Yes; always|Only in one repository|Only with SafeTensors",
      "What should you do when a model repository has no clear license?|Clarify permission before assuming reuse rights|Assume public domain|Choose any license yourself|Remove the author name",
      "Does a Hub license tag replace reading the actual license text?|No|Yes; tags override contracts|Only for popular models|Only for API use",
    ],
  ],
];

licenses.push(
  [
    "llama31",
    "Llama 3.1 Community License",
    "https://huggingface.co/meta-llama/Llama-3.1-8B-Instruct/blob/main/LICENSE",
    [
      "What governs use of Llama 3.1 weights?|The version-specific community license|MIT automatically|Public domain status|The GPU warranty",
      "Which Llama 3.1 policy must a licensee also consider?|Acceptable Use Policy|Only a package-lock file|Only an image color profile|Only the hosting bill",
      "Does Llama 3.1 quantization remove upstream licensing duties?|No|Yes; all duties disappear|Only for int4|Only for CPU inference",
      "What branding statement is required for qualifying Llama 3.1 distributions or services?|Built with Llama|Approved by Meta|Public domain model|Official Meta partner",
      "Why check the Llama 3.1 monthly-active-user provision?|Certain very large services need separate permission|It defines context length|It sets parameter count|It sets a universal minimum audience",
    ],
  ],
  [
    "llama32",
    "Llama 3.2 Community License",
    "https://huggingface.co/meta-llama/Llama-3.2-11B-Vision-Instruct/blob/main/LICENSE.txt",
    [
      "Does Llama 3.2 use a custom agreement rather than generic MIT terms?|Yes|No; always MIT|Only after fine-tuning|Only after quantization",
      "Which Llama 3.2 variants have a specific EU-related license provision?|Multimodal models|Every text-only model without exception|Only tokenizer files|Only documentation",
      "Does the Llama 3.2 EU provision also exclude end users of an incorporated product or service?|No; the clause states an end-user exception|Yes; every end user|Only when using mobile|Only for paid accounts",
      "What should a Llama 3.2 redistributor retain and provide as required?|The agreement and attribution notices|Only a renamed model|Only a performance chart|Only a checksum",
      "Why read the exact Llama 3.2 model card and agreement before deployment?|Variant and location can affect applicable permissions|The extension determines all permissions|All Llama versions share identical terms|Offline use cancels the agreement",
    ],
  ],
  [
    "openrail_m",
    "CreativeML Open RAIL-M",
    "https://huggingface.co/spaces/CompVis/stable-diffusion-license/blob/main/license.txt",
    [
      "What distinguishes CreativeML Open RAIL-M from unrestricted permissive licensing?|Use-based restrictions|A ban on downloading|A universal commercial-use ban|A requirement for a specific GPU",
      "Where are restricted uses listed for CreativeML Open RAIL-M?|In the license attachment|Only in a filename|Only in a benchmark table|Only in a tokenizer",
      "Does making a model available for download remove Open RAIL-M obligations?|No|Yes|Only below one gigabyte|Only for nonprofits",
      "What must downstream model sharing account for under Open RAIL-M?|Redistribution conditions and use restrictions|Only download counts|Only training speed|Only checkpoint size",
      "Does an Open RAIL-M license guarantee rights in every generated image?|No; other rights and output responsibilities remain relevant|Yes; every image is cleared|Only at low resolution|Only for commercial users",
    ],
  ],
  [
    "openrail_plus",
    "CreativeML Open RAIL Plus Plus M",
    "https://huggingface.co/stabilityai/stable-diffusion-xl-base-1.0/blob/main/LICENSE.md",
    [
      "Should CreativeML Open RAIL++-M be treated as identical to MIT?|No; it includes model-specific conditions|Yes|Only for image models|Only after download",
      "What must be checked before a use of an Open RAIL++-M model?|Its use restrictions and applicable terms|Only its sample image quality|Only its file extension|Only its download rank",
      "Does Open RAIL++-M automatically certify generated content as legally cleared?|No|Yes|Only for text prompts|Only for square images",
      "Why retain license notices in an Open RAIL++-M redistribution?|Recipients need the applicable conditions and rights information|Notices improve inference speed|Notices reduce VRAM|Notices replace the model card",
      "Can a fine-tune author simply ignore upstream Open RAIL++-M restrictions?|No|Yes; any fine-tune removes them|Only below eight bits|Only with a new filename",
    ],
  ],
);

export const standardBanks = {};
export const standardTopics = [];
for (const [kind, rows] of [
  ["file", formats],
  ["license", licenses],
]) {
  for (const row of rows) {
    const [key, title] = row;
    const [group, source, entries] =
      kind === "file" ? row.slice(2) : ["Licenses", ...row.slice(2)];
    const id = `${kind}_${key}`;
    const name = kind === "file" ? `.${key} — ${title}` : title;
    const questions = entries.map((entry, index) => {
      const [prompt, ...options] = entry.split("|");
      return {
        id: `${id}-${index + 1}`,
        question: `${prompt} (${kind === "file" ? `.${key}` : title})`,
        options,
        answerIndex: 0,
        skill: [
          "Core behavior",
          "Applied use",
          "Structure and obligations",
          "Failure modes",
          "Limits and judgment",
        ][index],
        difficulty:
          index === 0 ? "foundation" : index === 4 ? "advanced" : "applied",
        explanation: `${options[0]}. Review the linked specification or terms for context and exceptions.`,
        sources: [
          {
            label: "Official specification / license documentation",
            url: source,
          },
        ],
      };
    });
    standardBanks[id] = { version: 1, reviewedAt: "2026-10-13", questions };
    standardTopics.push({
      id,
      name,
      cat: kind === "file" ? "formats" : "licenses",
      born: "Standards learning collection",
      tag:
        kind === "file"
          ? `${group}: understand the .${key} format, structure and safe handling.`
          : `Understand ${title}: permissions, conditions and limitations.`,
      history: questions.map((q) => `${q.question} ${q.options[0]}.`).join(" "),
      why:
        kind === "file"
          ? `Recognize ${title} files and avoid incorrect parsing, unsafe loading or format assumptions.`
          : `Make informed reuse and redistribution decisions under ${title}; this lesson is not legal advice.`,
      rel: {
        seeAlso: [kind === "file" ? "file_json" : "license_model_terms"].filter(
          (related) => related !== id,
        ),
      },
      challenges: questions.map((q) => q.question),
      extension: {
        problemItSolves:
          kind === "file"
            ? `Helps select and validate ${title} data instead of trusting a filename extension alone.`
            : `Explains the obligations that a license label alone can hide. Verify the exact version and upstream terms.`,
        historyNotes: questions.map((q) => `${q.question} ${q.options[0]}.`),
        docs: [
          {
            label: "Official specification / license documentation",
            url: source,
          },
        ],
        latestChanges: [
          "Learning notes checked October 13, 2026. Consult the official source for subsequent changes.",
        ],
        practiceChallenges: [
          {
            level: 2,
            title: "Apply the rules",
            prompt:
              kind === "file"
                ? `Inspect a small .${key} example with a suitable tool. Explain its structure and one failure mode before opening untrusted files.`
                : `Inspect a real distribution using ${title}. Identify its license version, required notices, upstream dependencies and any unresolved permissions.`,
            format: "review",
          },
        ],
      },
    });
  }
}
for (const topic of standardTopics) {
  const family = topic.tag.split(":")[0];
  topic.rel.seeAlso = standardTopics
    .filter(
      (other) =>
        other.id !== topic.id &&
        (topic.cat === "licenses"
          ? other.id === "license_model_terms" ||
            other.id === "license_mit" ||
            other.id === "license_apache_2"
          : other.tag.split(":")[0] === family),
    )
    .slice(0, 3)
    .map((other) => other.id);
}

// Every schema imports Zod from here: `import * as z from "@/lib/zod"`.
//
// Zod Mini: the same checks as classic Zod, written as functions rather than
// methods, so the browser downloads only the parts these schemas use.
//
// The Content-Security-Policy forbids eval. Unless told not to, the first
// schema Zod builds tries `new Function` to see whether it can compile faster
// parsers; the error is caught, but browsers still report a CSP violation.
// Importing Zod through this module runs the setting before any schema is built.

import { config } from "zod/mini";

config({ jitless: true });

export * from "zod/mini";

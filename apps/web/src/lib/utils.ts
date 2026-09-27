import { createCn } from "cn/config";

/**
 * `cn`, taught Steep's type scale.
 *
 * The merger only recognises Tailwind's built-in size names. Steep's scale is
 * custom (`text-caption`, `text-body`, `text-body-lg`, … in globals.css), so
 * out of the box it read `text-body` as a *text colour* — and resolved the
 * "conflict" with `text-primary-foreground` by deleting the colour. Every filled
 * button rendered ink text on an ink lozenge, and any card or alert whose
 * variant set a colour lost its font size the other way round.
 *
 * Registering the scale as font sizes (and its trackings as letter-spacing)
 * lets size and colour coexist, as they are meant to. Every component imports
 * `cn` from here, never from the package directly.
 */
export const cn = createCn({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "caption",
            "body",
            "body-lg",
            "subheading",
            "heading-sm",
            "heading",
            "heading-lg",
            "display",
          ],
        },
      ],
      tracking: [{ tracking: ["heading-sm", "heading", "heading-lg", "display"] }],
    },
  },
});

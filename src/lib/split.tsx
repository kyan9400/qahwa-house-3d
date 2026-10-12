import { Fragment, type CSSProperties } from "react";

/**
  Wraps each word of a heading in two spans for the CSS line reveal (see `.w` in globals.css).
  Runs on the server, so there is no JS text measuring and no layout shift; the words stay real, indexable text.
  The word spans are aria-hidden: give the heading `aria-label={text}` so screen readers hear one phrase,
  not one item per word.
*/
export function splitWords(text: string) {
  const words = text.split(" ");
  return (
    <span aria-hidden="true">
      {words.map((word, i) => (
        <Fragment key={i}>
          <span className="w">
            <span style={{ "--i": i } as CSSProperties}>{word}</span>
          </span>
          {i < words.length - 1 ? " " : null}
        </Fragment>
      ))}
    </span>
  );
}

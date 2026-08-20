function setAttribute(attributes: string, name: string, value: string): string {
  const pattern = new RegExp(`(\\s${name}\\s*=\\s*)(["'])(.*?)\\2`, "i");
  if (pattern.test(attributes)) return attributes.replace(pattern, `$1"${value}"`);
  return `${attributes} ${name}="${value}"`;
}

function addClass(attributes: string, className: string): string {
  const classMatch = attributes.match(/\sclass\s*=\s*(["'])(.*?)\1/i);
  const classes = (classMatch?.[2] ?? "").split(/\s+/).filter(Boolean);
  if (!classes.includes(className)) classes.push(className);
  return setAttribute(attributes, "class", classes.join(" "));
}

export function keepPurpleBoardPublic(html: string, current = false): string {
  return html.replace(/<a\b([^>]*)>([\s\S]*?)<\/a>/gi, (anchor, attributes: string, inner: string) => {
    const text = inner.replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim().toLowerCase();
    if (text !== "#purpleboard") return anchor;
    let nextAttributes = setAttribute(attributes, "href", "/purpleboard");
    if (current) {
      nextAttributes = setAttribute(nextAttributes, "aria-current", "page");
      nextAttributes = addClass(nextAttributes, "active-tab");
    }
    return `<a${nextAttributes}>${inner}</a>`;
  });
}

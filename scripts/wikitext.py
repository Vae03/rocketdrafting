"""Minimal balanced {{ }} wikitext template parser helpers."""
import re


def find_balanced(text, open_idx):
    """open_idx points at the first '{' of a '{{'. Returns (content_without_braces, end_idx_after_closing)."""
    assert text[open_idx:open_idx + 2] == "{{"
    depth = 0
    i = open_idx
    n = len(text)
    while i < n:
        if text[i:i + 2] == "{{":
            depth += 1
            i += 2
            continue
        if text[i:i + 2] == "}}":
            depth -= 1
            i += 2
            if depth == 0:
                return text[open_idx + 2:i - 2], i
            continue
        i += 1
    raise ValueError("Unbalanced braces from " + str(open_idx))


def find_all_templates(text, name):
    """Find all top-level (in the given text) occurrences of {{Name ...}}, case-insensitive on name.
    Returns list of (content, start_idx, end_idx)."""
    results = []
    pattern = re.compile(r"\{\{\s*" + re.escape(name) + r"\b\s*\|?", re.IGNORECASE)
    i = 0
    while True:
        m = pattern.search(text, i)
        if not m:
            break
        raw_content, end_idx = find_balanced(text, m.start())
        # raw_content starts with the template name (and matched trailing '|' if any);
        # strip exactly what the opening pattern matched so params start cleanly.
        prefix_len = m.end() - (m.start() + 2)
        content = raw_content[prefix_len:]
        results.append((content, m.start(), end_idx))
        i = end_idx
    return results


def split_params(content):
    """Split a template's inner content on top-level '|' (respecting nested {{}} and [[ ]]).
    Returns list of raw param strings (each still 'key=value' or a bare positional value)."""
    params = []
    depth = 0
    depth_sq = 0
    current = []
    i = 0
    n = len(content)
    while i < n:
        c = content[i]
        two = content[i:i + 2]
        if two == "{{" or two == "[[":
            depth += 1 if two == "{{" else 0
            depth_sq += 1 if two == "[[" else 0
            current.append(two)
            i += 2
            continue
        if two == "}}" or two == "]]":
            if two == "}}":
                depth -= 1
            else:
                depth_sq -= 1
            current.append(two)
            i += 2
            continue
        if c == "|" and depth == 0 and depth_sq == 0:
            params.append("".join(current))
            current = []
            i += 1
            continue
        current.append(c)
        i += 1
    params.append("".join(current))
    return params


def parse_named_params(param_list, skip_first_positional=True):
    """Given split_params() output, return (positional_list, named_dict)."""
    positional = []
    named = {}
    for p in param_list:
        m = re.match(r"^([A-Za-z0-9_ .-]+)=(.*)$", p, re.DOTALL)
        if m and not m.group(1).strip().isdigit():
            named[m.group(1).strip().lower()] = m.group(2).strip()
        else:
            positional.append(p.strip())
    return positional, named

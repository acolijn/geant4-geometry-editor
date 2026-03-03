import { useState, useCallback } from 'react';
import { Box } from '@mui/material';

/* ── colour palette (VS Code light) ─────────────────────── */
const COLORS = {
  key: '#0451a5',
  string: '#a31515',
  number: '#098658',
  boolean: '#0000ff',
  null: '#0000ff',
  bracket: '#333',
  toggle: '#888',
  preview: '#999',
};

const INDENT = 18; // px per nesting level

/* ── Leaf value renderer ──────────────────────────────────── */
const JsonValue = ({ value }) => {
  if (value === null) return <span style={{ color: COLORS.null }}>null</span>;
  if (typeof value === 'boolean')
    return <span style={{ color: COLORS.boolean }}>{value ? 'true' : 'false'}</span>;
  if (typeof value === 'number')
    return <span style={{ color: COLORS.number }}>{value}</span>;
  if (typeof value === 'string')
    return <span style={{ color: COLORS.string }}>&quot;{value}&quot;</span>;
  return <span>{String(value)}</span>;
};

/* ── Collapsed preview (e.g.  { world, volumes, materials }  or  [3 items] ) */
const CollapsedPreview = ({ data }) => {
  if (Array.isArray(data)) {
    return (
      <span style={{ color: COLORS.preview }}>
        [{data.length} item{data.length !== 1 ? 's' : ''}]
      </span>
    );
  }
  const keys = Object.keys(data);
  const shown = keys.slice(0, 4).join(', ');
  const more = keys.length > 4 ? ', …' : '';
  return (
    <span style={{ color: COLORS.preview }}>
      {'{ '}{shown}{more}{' }'}
    </span>
  );
};

/* ── Toggle arrow ─────────────────────────────────────────── */
const Toggle = ({ open, onClick }) => (
  <span
    onClick={onClick}
    style={{
      cursor: 'pointer',
      userSelect: 'none',
      display: 'inline-block',
      width: 14,
      textAlign: 'center',
      color: COLORS.toggle,
      fontFamily: 'monospace',
      fontSize: '0.75rem',
    }}
  >
    {open ? '▼' : '▶'}
  </span>
);

/* ── Recursive tree node ──────────────────────────────────── */

/**
 * Render a single JSON node (object, array, or primitive).
 *
 * @param {object} props
 * @param {string|number|null} props.keyName   – The key in the parent (null for root)
 * @param {*}                  props.value      – The value to render
 * @param {number}             props.depth      – Current nesting depth
 * @param {boolean}            props.isLast     – Whether this is the last sibling
 * @param {number}             props.defaultOpen – Auto-expand levels (default 1)
 */
const JsonTreeNode = ({ keyName, value, depth = 0, isLast = true, defaultOpen = 1 }) => {
  const isExpandable = value !== null && typeof value === 'object';
  const [open, setOpen] = useState(depth < defaultOpen);
  const toggle = useCallback(() => setOpen(o => !o), []);

  const comma = isLast ? '' : ',';
  const indent = { paddingLeft: depth * INDENT };

  /* ── Primitive leaf ──────────────────────────────────── */
  if (!isExpandable) {
    return (
      <div style={{ ...indent, whiteSpace: 'nowrap' }}>
        <span style={{ display: 'inline-block', width: 14 }} />
        {keyName !== null && (
          <>
            <span style={{ color: COLORS.key }}>&quot;{keyName}&quot;</span>
            <span style={{ color: COLORS.bracket }}>: </span>
          </>
        )}
        <JsonValue value={value} />
        <span style={{ color: COLORS.bracket }}>{comma}</span>
      </div>
    );
  }

  /* ── Object / Array ─────────────────────────────────── */
  const isArray = Array.isArray(value);
  const openBracket = isArray ? '[' : '{';
  const closeBracket = isArray ? ']' : '}';
  const entries = isArray
    ? value.map((v, i) => [i, v])
    : Object.entries(value);

  return (
    <>
      {/* Header line: toggle + key + open bracket (+ preview when collapsed) */}
      <div style={{ ...indent, whiteSpace: 'nowrap' }}>
        <Toggle open={open} onClick={toggle} />
        {keyName !== null && (
          <>
            <span style={{ color: COLORS.key }}>&quot;{keyName}&quot;</span>
            <span style={{ color: COLORS.bracket }}>: </span>
          </>
        )}
        <span style={{ color: COLORS.bracket }}>{openBracket}</span>
        {!open && (
          <>
            {' '}
            <CollapsedPreview data={value} />
            <span style={{ color: COLORS.bracket }}>
              {closeBracket}{comma}
            </span>
          </>
        )}
      </div>

      {/* Children (when expanded) */}
      {open && (
        <>
          {entries.map(([k, v], idx) => (
            <JsonTreeNode
              key={isArray ? idx : k}
              keyName={isArray ? null : k}
              value={v}
              depth={depth + 1}
              isLast={idx === entries.length - 1}
              defaultOpen={defaultOpen}
            />
          ))}
          {/* Closing bracket */}
          <div style={{ ...indent, whiteSpace: 'nowrap' }}>
            <span style={{ display: 'inline-block', width: 14 }} />
            <span style={{ color: COLORS.bracket }}>
              {closeBracket}{comma}
            </span>
          </div>
        </>
      )}
    </>
  );
};

/* ── Public wrapper ───────────────────────────────────────── */

/**
 * Interactive, collapsible JSON tree viewer.
 *
 * @param {object}  props
 * @param {*}       props.data         – Parsed JSON data to display
 * @param {number}  [props.defaultOpen=1] – How many levels to auto-expand
 */
export const JsonTree = ({ data, defaultOpen = 1 }) => {
  if (data === undefined || data === null) return null;

  return (
    <Box
      sx={{
        fontFamily:
          '"Fira Code", "Cascadia Code", "JetBrains Mono", Consolas, "Courier New", monospace',
        fontSize: '0.8rem',
        lineHeight: 1.6,
        whiteSpace: 'pre',
        overflowX: 'auto',
      }}
    >
      <JsonTreeNode keyName={null} value={data} depth={0} defaultOpen={defaultOpen} />
    </Box>
  );
};

export default JsonTree;

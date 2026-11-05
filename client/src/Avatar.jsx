import React from 'react';
import { src } from './api.js';

const COLORS = ['#ff6b6b', '#f59f00', '#40c057', '#228be6', '#7950f2', '#e64980', '#15aabf', '#fd7e14'];
const colorOf = s => COLORS[[...(s || '')].reduce((a, c) => a + c.charCodeAt(0), 0) % COLORS.length];

export default function Avatar({ u, size = 36 }) {
  const st = { width: size, height: size, fontSize: size * 0.42 };
  if (u?.avatar) return <img className="avatar" style={st} src={src(u.avatar)} alt={u.name || ''} />;
  return <span className="avatar" style={{ ...st, background: colorOf(u?.email) }}>{(u?.name || u?.email || '?')[0].toUpperCase()}</span>;
}

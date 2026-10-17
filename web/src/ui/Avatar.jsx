// Foto de perfil, o la inicial sobre un color fijo para cada persona si no tiene.
function colorFor(name) {
  let n = 0; for (const c of name) n = (n * 31 + c.charCodeAt(0)) % 360;
  return `hsl(${n} 55% 48%)`;
}

export function Avatar({ user, size = '' }) {
  if (user.avatar) return <img className={`avatar ${size}`} src={user.avatar} alt="" />;
  return <div className={`avatar ${size}`} style={{ background: colorFor(user.username) }}>
    {(user.displayName || user.username)[0].toUpperCase()}
  </div>;
}

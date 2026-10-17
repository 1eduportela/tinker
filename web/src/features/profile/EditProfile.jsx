// Ventana "Editar perfil": banner, foto, nombre, frase y bienvenida.
import { useRef, useState } from 'react';
import { api } from '../../core/api.js';
import { refreshPage } from '../../core/router.js';
import { getMe, setMe } from '../../core/session.js';
import { pickImage } from '../../media/images.js';
import { Avatar } from '../../ui/Avatar.jsx';
import { openModal } from '../../ui/modal.jsx';
import { toast } from '../../ui/toast.jsx';

export function openEditProfile() {
  openModal(close => <EditProfile me={getMe()} close={close} />);
}

function EditProfile({ me, close }) {
  const [newAvatar, setNewAvatar] = useState(null);
  const [newBanner, setNewBanner] = useState(null);
  const [removeBanner, setRemoveBanner] = useState(false);
  const [busy, setBusy] = useState(false);
  const name = useRef(), bio = useRef(), about = useRef();
  const bannerSrc = newBanner || (!removeBanner && me.banner);

  const save = async () => {
    setBusy(true);
    try {
      const { user } = await api('PUT', '/api/me', { displayName: name.current.value, bio: bio.current.value, about: about.current.value,
        avatar: newAvatar, banner: newBanner, removeBanner });
      close(); toast('Perfil guardado'); setMe(user); refreshPage();
      return;
    } catch (e) { toast(e.message); }
    setBusy(false);
  };

  return (
    <div>
      <h2>Editar perfil</h2>
      <label>Banner</label>
      <div className="banner-pick" style={{ backgroundImage: bannerSrc ? `url("${bannerSrc}")` : undefined }}>
        <button className="btn ghost" type="button" onClick={() => pickImage(d => { setNewBanner(d); setRemoveBanner(false); }, 2400)}>
          {bannerSrc ? 'Cambiar banner' : 'Añadir banner'}
        </button>
        {bannerSrc && <button className="btn ghost" type="button" onClick={() => { setNewBanner(null); setRemoveBanner(true); }}>Quitar</button>}
      </div>
      <label>Foto de perfil</label>
      <div className="avatar-edit">
        <div>{newAvatar ? <img className="avatar big" src={newAvatar} /> : <Avatar user={me} size="big" />}</div>
        <button className="btn ghost" onClick={() => pickImage(setNewAvatar)}>Cambiar foto</button>
      </div>
      <label>Nombre visible</label>
      <input ref={name} type="text" defaultValue={me.displayName} maxLength={40} />
      <label>Frase corta (sale en el banner)</label>
      <input ref={bio} type="text" defaultValue={me.bio} maxLength={200} placeholder="Ingeniero mecánico, ciclista, maker…" />
      <label>Bienvenida</label>
      <textarea ref={about} rows={6} maxLength={3000} defaultValue={me.about}
        placeholder="Preséntate: quién eres, a qué te dedicas, qué te gusta cacharrear…" />
      <div className="row" style={{ marginTop: 16 }}><div className="spacer" />
        <button className="btn" disabled={busy} onClick={save}>Guardar</button>
      </div>
    </div>
  );
}

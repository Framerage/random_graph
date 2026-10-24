import { useState } from 'react';
import { isMuted, setMuted } from '@/shared/audio';
import { Button } from '@/shared/ui';

export function SoundToggle() {
  // Состояние кнопки берём из модуля звука: он живёт дольше компонента (например, после выхода и входа)
  const [soundOn, setSoundOn] = useState(() => !isMuted());
  const toggle = () => {
    setMuted(soundOn);
    setSoundOn(!soundOn);
  };

  return (
    <Button variant="ghost" onClick={toggle} title={soundOn ? 'Выключить звук' : 'Включить звук'}>
      {soundOn ? '🔊' : '🔇'}
    </Button>
  );
}

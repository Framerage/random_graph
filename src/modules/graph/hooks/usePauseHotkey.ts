import { useEffect, useEffectEvent } from 'react';
import { PAUSE_CODE } from '../constants';

/**
 * Пауза и продолжение с клавиатуры (PAUSE_CODE), пока идёт игра.
 * Пробел по сфокусированной кнопке её «нажимает» на keyup — например, ту же «Пауза» после клика мышью,
 * и пауза переключилась бы дважды. Поэтому keyup пробела тоже гасим: браузерная активация не срабатывает.
 */
export function usePauseHotkey(toggle: () => void, enabled: boolean) {
  // Свежий toggle без переподписки: он меняется на каждое переключение паузы
  const onToggle = useEffectEvent(toggle);

  useEffect(() => {
    if (!enabled) return;
    // Один abort снимает оба слушателя
    const controller = new AbortController();
    const { signal } = controller;

    window.addEventListener(
      'keydown',
      (event) => {
        if (event.code !== PAUSE_CODE) return;
        // Заодно не прокручиваем страницу
        event.preventDefault();
        if (!event.repeat) onToggle();
      },
      { signal },
    );
    window.addEventListener(
      'keyup',
      (event) => {
        if (event.code === PAUSE_CODE) event.preventDefault();
      },
      { signal },
    );

    return () => controller.abort();
  }, [enabled]);
}

"use client";

import {
  useEffect,
  useRef,
  useState,
  KeyboardEvent,
  ChangeEvent,
} from "react";
import { ArrowUp, Mic, Square } from "lucide-react";
import clsx from "clsx";

/* =========================================================
   TIPOS DO SPEECH RECOGNITION
========================================================= */

interface SpeechRecognitionEvent extends Event {
  results: SpeechRecognitionResultList;
}

interface SpeechRecognitionErrorEvent extends Event {
  error: string;
  message?: string;
}

interface SpeechRecognitionInstance {
  lang: string;
  interimResults: boolean;
  continuous: boolean;
  maxAlternatives: number;

  start(): void;
  stop(): void;
  abort(): void;

  onstart: (() => void) | null;
  onend: (() => void) | null;
  onresult:
    | ((event: SpeechRecognitionEvent) => void)
    | null;
  onerror:
    | ((event: SpeechRecognitionErrorEvent) => void)
    | null;
}

interface SpeechRecognitionConstructor {
  new (): SpeechRecognitionInstance;
}

declare global {
  interface Window {
    SpeechRecognition?: SpeechRecognitionConstructor;
    webkitSpeechRecognition?: SpeechRecognitionConstructor;
  }
}

/* =========================================================
   PROPS
========================================================= */

type ChatInputProps = {
  value: string;
  onChange: (value: string) => void;
  onSend: () => void;
  disabled?: boolean;
  placeholder?: string;

  /*
   * Mantidos para não quebrar o componente pai caso
   * você já esteja passando essas propriedades.
   */
  isListening?: boolean;
  onStartListening?: () => void;
  onStopListening?: () => void;
};

/* =========================================================
   COMPONENTE
========================================================= */

export default function ChatInput({
  value,
  onChange,
  onSend,
  disabled = false,
  placeholder,
  isListening: externalIsListening,
  onStartListening,
  onStopListening,
}: ChatInputProps) {
  const taRef = useRef<HTMLTextAreaElement>(null);

  const recognitionRef =
    useRef<SpeechRecognitionInstance | null>(null);

  const shouldKeepListeningRef = useRef(false);

  const recognitionStartingRef = useRef(false);

  const speechBaseTextRef = useRef("");

  const restartTimeoutRef =
    useRef<ReturnType<typeof setTimeout> | null>(null);

  const [internalIsListening, setInternalIsListening] =
    useState(false);

  /* =======================================================
     ESTADO REAL DO MICROFONE
  ======================================================= */

  const isListening =
    externalIsListening !== undefined
      ? externalIsListening
      : internalIsListening;

  /* =======================================================
     AJUSTA ALTURA DO TEXTAREA
  ======================================================= */

  const resizeTextarea = () => {
    const textarea = taRef.current;

    if (!textarea) return;

    textarea.style.height = "auto";

    const minHeight = 36;
    const maxHeight = 120;

    const height = Math.min(
      Math.max(textarea.scrollHeight, minHeight),
      maxHeight
    );

    textarea.style.height = `${height}px`;
  };

  /* =======================================================
     LIMPA TIMEOUT
  ======================================================= */

  const clearRestartTimeout = () => {
    if (restartTimeoutRef.current) {
      clearTimeout(restartTimeoutRef.current);
      restartTimeoutRef.current = null;
    }
  };

  /* =======================================================
     OBTÉM SPEECH RECOGNITION
  ======================================================= */

  const getSpeechRecognition =
    (): SpeechRecognitionConstructor | null => {
      if (typeof window === "undefined") {
        return null;
      }

      return (
        window.SpeechRecognition ??
        window.webkitSpeechRecognition ??
        null
      );
    };

  /* =======================================================
     INICIA RECONHECIMENTO
  ======================================================= */

  const startRecognition = () => {
    const SpeechRecognition =
      getSpeechRecognition();

    if (!SpeechRecognition) {
      alert(
        "Seu navegador não oferece suporte à transcrição por voz."
      );

      return;
    }

    if (disabled) return;

    if (recognitionStartingRef.current) {
      return;
    }

    recognitionStartingRef.current = true;

    clearRestartTimeout();

    /*
     * Guarda o texto que já existia antes de começar a falar.
     * Isso permite continuar uma mensagem que já estava sendo
     * digitada.
     */
    speechBaseTextRef.current = value.trim();

    try {
      const recognition = new SpeechRecognition();

      recognition.lang = "pt-BR";

      /*
       * IMPORTANTE:
       *
       * Não usamos continuous = true.
       *
       * O navegador pode encerrar a sessão depois de uma pausa.
       * Quando isso acontecer, o onend reinicia automaticamente
       * enquanto o usuário ainda estiver no modo "ouvindo".
       */
      recognition.continuous = false;

      recognition.interimResults = true;

      recognition.maxAlternatives = 1;

      recognition.onstart = () => {
        recognitionStartingRef.current = false;

        setInternalIsListening(true);

        onStartListening?.();
      };

      recognition.onresult = (
        event: SpeechRecognitionEvent
      ) => {
        let transcript = "";

        for (
          let i = 0;
          i < event.results.length;
          i++
        ) {
          const result = event.results[i];

          if (!result || result.length === 0) {
            continue;
          }

          transcript += result[0]?.transcript ?? "";
        }

        transcript = transcript.trim();

        if (!transcript) return;

        const baseText =
          speechBaseTextRef.current.trim();

        const finalText = baseText
          ? `${baseText} ${transcript}`
          : transcript;

        onChange(finalText);

        requestAnimationFrame(() => {
          resizeTextarea();

          const textarea = taRef.current;

          if (textarea) {
            textarea.scrollTop = textarea.scrollHeight;
          }
        });
      };

      recognition.onerror = (
        event: SpeechRecognitionErrorEvent
      ) => {
        console.warn(
          "[ChatInput] Erro no reconhecimento de voz:",
          event.error
        );

        recognitionStartingRef.current = false;

        /*
         * Não cancelamos a interface imediatamente em erros
         * transitórios como "no-speech".
         *
         * Se o usuário ainda estiver ouvindo, o onend poderá
         * iniciar novamente.
         */

        if (
          event.error === "not-allowed" ||
          event.error === "service-not-allowed"
        ) {
          shouldKeepListeningRef.current = false;

          setInternalIsListening(false);

          onStopListening?.();

          alert(
            "Permita o acesso ao microfone para usar a transcrição por voz."
          );
        }
      };

      recognition.onend = () => {
        recognitionStartingRef.current = false;

        /*
         * O navegador encerrou essa sessão.
         *
         * Se o usuário ainda não clicou em PARAR,
         * iniciamos outra sessão automaticamente.
         */
        if (
          shouldKeepListeningRef.current &&
          !disabled
        ) {
          clearRestartTimeout();

          restartTimeoutRef.current = setTimeout(() => {
            startRecognition();
          }, 150);
        } else {
          setInternalIsListening(false);

          onStopListening?.();
        }
      };

      recognitionRef.current = recognition;

      shouldKeepListeningRef.current = true;

      recognition.start();
    } catch (error) {
      recognitionStartingRef.current = false;

      console.error(
        "[ChatInput] Não foi possível iniciar o microfone:",
        error
      );

      setInternalIsListening(false);

      onStopListening?.();
    }
  };

  /* =======================================================
     PARA RECONHECIMENTO
  ======================================================= */

  const stopRecognition = () => {
    shouldKeepListeningRef.current = false;

    clearRestartTimeout();

    recognitionStartingRef.current = false;

    const recognition =
      recognitionRef.current;

    if (recognition) {
      try {
        recognition.stop();
      } catch {
        // Ignora caso o reconhecimento já tenha terminado.
      }
    }

    recognitionRef.current = null;

    setInternalIsListening(false);

    onStopListening?.();

    /*
     * Mantém o texto exatamente onde está.
     *
     * O usuário pode editar antes de enviar.
     */
    requestAnimationFrame(() => {
      resizeTextarea();

      taRef.current?.focus();
    });
  };

  /* =======================================================
     BOTÃO DO MICROFONE
  ======================================================= */

  const handleMicClick = () => {
    if (disabled) return;

    if (isListening) {
      stopRecognition();
    } else {
      startRecognition();
    }
  };

  /* =======================================================
     ALTERAÇÃO MANUAL DO TEXTO
  ======================================================= */

  const handleChange = (
    e: ChangeEvent<HTMLTextAreaElement>
  ) => {
    onChange(e.target.value);

    requestAnimationFrame(() => {
      resizeTextarea();
    });
  };

  /* =======================================================
     TECLADO
  ======================================================= */

  const handleKeyDown = (
    e: KeyboardEvent<HTMLTextAreaElement>
  ) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();

      /*
       * Regra importante: a mensagem NUNCA pode ser enviada enquanto o
       * microfone ainda está ouvindo. O primeiro Enter (ou clique) apenas
       * para a gravação e deixa o texto pronto para revisão; o usuário
       * precisa confirmar de novo (Enter ou botão enviar) para de fato
       * enviar a mensagem transcrita.
       */
      if (isListening) {
        stopRecognition();
        return;
      }

      if (value.trim() && !disabled) {
        onSend();
      }
    }
  };

  /* =======================================================
     ENVIO
  ======================================================= */

  const handleSend = () => {
    // Bloqueia o envio enquanto o áudio ainda está sendo transcrito.
    if (isListening || !value.trim() || disabled) return;

    onSend();

    requestAnimationFrame(() => {
      if (taRef.current) {
        taRef.current.style.height = "36px";
      }
    });
  };

  /* =======================================================
     DESMONTAGEM
  ======================================================= */

  useEffect(() => {
    return () => {
      shouldKeepListeningRef.current = false;

      clearRestartTimeout();

      const recognition =
        recognitionRef.current;

      if (recognition) {
        try {
          recognition.abort();
        } catch {
          // Ignora.
        }
      }

      recognitionRef.current = null;
    };
  }, []);

  /* =======================================================
     AJUSTA ALTURA QUANDO VALUE MUDA EXTERNAMENTE
  ======================================================= */

  useEffect(() => {
    resizeTextarea();
  }, [value]);

  /* =======================================================
     SUPORTE
  ======================================================= */

  const speechSupported =
    typeof window !== "undefined" &&
    !!(
      window.SpeechRecognition ||
      window.webkitSpeechRecognition
    );

  // Enquanto estiver ouvindo, o envio fica bloqueado — o usuário precisa
  // parar a gravação e revisar/editar a transcrição antes de enviar.
  const canSend =
    value.trim().length > 0 && !disabled && !isListening;

  /* =======================================================
     RENDER
  ======================================================= */

  return (
    <div className="shrink-0 border-t border-line bg-canvas-raised px-4 py-2 sm:px-6">
      <div
        className={clsx(
          "flex items-end gap-1.5",
          "rounded-2xl border",
          "border-line-strong",
          "bg-canvas",
          "px-3 py-2",
          "transition-colors",
          "focus-within:border-line-strong"
        )}
      >
        <label
          htmlFor="chat-input"
          className="sr-only"
        >
          Escreva sua mensagem
        </label>

        {/* =================================================
            TEXTAREA
        ================================================= */}

        <textarea
          id="chat-input"
          ref={taRef}
          value={value}
          disabled={disabled}
          onChange={handleChange}
          onKeyDown={handleKeyDown}
          rows={1}
          placeholder={
            placeholder ??
            "Escreva sua mensagem ou responda ao Copiloto…"
          }
          className={clsx(
            "min-h-[36px]",
            "max-h-[120px]",
            "flex-1",
            "resize-none",
            "overflow-y-auto",
            "border-0",
            "outline-none",
            "ring-0",
            "focus:border-0",
            "focus:outline-none",
            "focus:ring-0",
            "bg-transparent",
            "py-1",
            "text-[14px]",
            "leading-6",
            "text-charcoal",
            "placeholder:text-charcoal-faint",
            "disabled:opacity-60"
          )}
          style={{
            height: "36px",
          }}
        />

        {/* =================================================
            MICROFONE
        ================================================= */}

        {speechSupported && (
          <button
            type="button"
            onClick={handleMicClick}
            disabled={disabled}
            aria-label={
              isListening
                ? "Parar de ouvir"
                : "Falar mensagem"
            }
            title={
              isListening
                ? "Parar de ouvir"
                : "Falar mensagem"
            }
            className={clsx(
              "flex h-8 w-8 shrink-0 items-center justify-center",
              "rounded-full",
              "transition-all",
              "disabled:cursor-not-allowed",
              "disabled:opacity-40",
              isListening
                ? "bg-aevo text-white"
                : "text-charcoal-faint hover:bg-line hover:text-charcoal"
            )}
          >
            {isListening ? (
              <Square
                size={14}
                fill="currentColor"
              />
            ) : (
              <Mic size={18} />
            )}
          </button>
        )}

        {/* =================================================
            ENVIAR
        ================================================= */}

        <button
          type="button"
          onClick={handleSend}
          disabled={!canSend}
          aria-label={
            isListening ? "Pare a gravação para enviar" : "Enviar mensagem"
          }
          title={
            isListening ? "Pare a gravação para enviar" : "Enviar mensagem"
          }
          className={clsx(
            "flex h-8 w-8 shrink-0 items-center justify-center",
            "rounded-full",
            "transition-colors",
            canSend
              ? "bg-aevo text-canvas hover:bg-aevo-dark"
              : "bg-line text-charcoal-faint"
          )}
        >
          <ArrowUp size={16} />
        </button>
      </div>

      {/* ===================================================
          AVISO
      =================================================== */}

      {isListening ? (
        <p
          role="status"
          aria-live="polite"
          className="mt-1.5 flex items-center justify-center gap-1.5 text-center text-[11px] font-medium text-aevo-dark sm:justify-start"
        >
          <span className="h-1.5 w-1.5 shrink-0 animate-pulse rounded-full bg-aevo" aria-hidden="true" />
          Ouvindo… clique no microfone para parar, revisar e depois enviar.
        </p>
      ) : (
        <p className="mt-1.5 text-center text-[10.5px] text-charcoal-faint sm:text-left">
          As análises são geradas por IA e devem ser validadas por especialistas.
        </p>
      )}
    </div>
  );
}
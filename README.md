# Daggerheart Dice

Estensione per [Owlbear Rodeo](https://www.owlbear.rodeo/) che permette di tirare dadi di Daggerheart in 3D senza account o servizi esterni. Funziona anche per giocatori ospiti: il GM attiva l'estensione nella stanza e i tiri pubblici vengono ricevuti da tutti, anche quando il pannello del giocatore è chiuso.

## Installazione

Dopo il deploy su GitHub Pages, aggiungi l'URL del manifest nelle estensioni di Owlbear Rodeo:

```
https://<utente-github>.github.io/owlbear-rodeo-dh-dice/manifest.json
```

Apri una stanza, attiva **Daggerheart Dice** dall'elenco delle estensioni e usa il pulsante dell'estensione nella toolbar. Il manifest usa percorsi relativi, quindi funziona sia su GitHub Pages sia con il server locale.

## Uso

- **Dualità** tira immediatamente i due d12 Speranza e Paura. Vantaggio aggiunge un d6, Svantaggio lo sottrae.
- La barra a sinistra aggiunge dadi al pool. Usa clic destro o pressione lunga per rimuoverne uno.
- Vantaggio e Svantaggio nel pool sono disponibili soltanto con un singolo d20; in quel caso vengono mostrati due d20 e quello scartato resta visibile nella card.
- Il modificatore resta impostato tra un tiro e l'altro. Puoi usare i pulsanti, cliccare il valore per scriverlo o usare `↺` per azzerarlo.
- **Tutti** invia e conserva il tiro nello storico condiviso della stanza. **Solo io** lo mostra e lo salva soltanto sul client che ha tirato.
- `Invio` tira il pool e `D` esegue una Dualità, quando il focus non è in un campo di testo.

## Sviluppo locale

Serve Node.js 20–24; la CI usa Node 22 LTS.

```bash
npm ci
npm run dev
```

In Owlbear Rodeo, aggiungi `http://localhost:5173/manifest.json` come estensione. Fuori da Owlbear Rodeo il pannello usa un profilo locale chiamato `Dev` e un broadcast in loopback, utile per sviluppare l'interfaccia.

```bash
npm test
npm run build
```

`npm run build` genera il sito statico in `dist/`. Il workflow GitHub Actions incluso pubblica automaticamente il branch `main` su GitHub Pages; se il repository viene rinominato, aggiorna `githubPagesBase` in `vite.config.ts`.

## Struttura

- `src/dice/` contiene la logica pura dei tiri, l'RNG Web Crypto e i test Vitest.
- `src/obr/` raccoglie canali, metadata, popover e fallback standalone.
- `src/composables/` gestisce impostazioni, storico e invio dei tiri.
- `src/components/` contiene controlli Vue riutilizzabili per il pannello e le card.
- `src/pages/` contiene le quattro pagine OBR: pannello, background, overlay e risultato.
- [docs/dice-engine.md](docs/dice-engine.md) documenta lo spike e la scelta del motore 3D.

I dati dei tiri privati non vengono mai scritti nei metadata della stanza. Lo storico condiviso conserva al massimo 30 tiri pubblici.

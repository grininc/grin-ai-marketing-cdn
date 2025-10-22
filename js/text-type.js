jQuery(document).ready(function ($) {
  ///start gia text animation code

  const minSpeed = 25; // ms per character
  const maxSpeed = 55;
  const chunkSize = 1; // words per chunk
  const chunkDelay = 140; // ms between chunks

  function randDelay() {
    return Math.random() * (maxSpeed - minSpeed) + minSpeed;
  }

  function typeByChar($el, str) {
    $el.text("");
    return new Promise((resolve) => {
      let i = 0;
      (function _step() {
        if (i < str.length) {
          const ch = str.charAt(i++);
          $el.text($el.text() + ch);

          let delay = randDelay();
          if (/[.,!?;:]/.test(ch)) delay *= 6;
          else if (ch === " ") delay *= 1.2;

          setTimeout(_step, delay);
        } else {
          resolve();
        }
      })();
    });
  }

  function typeByChunks($el, str) {
    $el.text("");
    const words = str.split(/\s+/);
    return new Promise((resolve) => {
      let idx = 0;
      (function _chunk() {
        if (idx < words.length) {
          const chunk = words.slice(idx, idx + chunkSize).join(" ");
          $el.text($el.text() + (idx > 0 ? " " : "") + chunk);
          idx += chunkSize;
          setTimeout(_chunk, chunkDelay);
        } else {
          resolve();
        }
      })();
    });
  }

  function splitHTMLIntoChunks(html, chunkSize) {
    const tagRegex = /<\/?[^>]+>/g;
    const wordRegex = /(\S+\s*)/g;

    // 1) Tokenize into [{type:'tag'|'text', content, tagName?, isClosing?}, …]
    const tokens = [];
    let lastIdx = 0,
      m;
    while ((m = tagRegex.exec(html))) {
      // text between tags
      if (m.index > lastIdx) {
        const text = html.slice(lastIdx, m.index);
        let wm;
        while ((wm = wordRegex.exec(text))) {
          tokens.push({ type: "text", content: wm[1] });
        }
      }
      // the tag
      const tag = m[0];
      const isClosing = /^<\//.test(tag);
      const tagName = (tag.match(/^<\/?([^\s>]+)/) || [])[1].toLowerCase();
      tokens.push({ type: "tag", content: tag, tagName, isClosing });
      lastIdx = m.index + tag.length;
    }
    // trailing text
    if (lastIdx < html.length) {
      const tail = html.slice(lastIdx);
      let wm;
      while ((wm = wordRegex.exec(tail))) {
        tokens.push({ type: "text", content: wm[1] });
      }
    }

    // 2) Group into chunks, tracking open tags
    const chunks = [];
    let openTags = []; // stack of tagNames still open
    let chunkToks = [];
    let wordCount = 0;

    function closeAll() {
      return openTags
        .slice()
        .reverse()
        .map((t) => `</${t}>`)
        .join("");
    }
    function reopenAll() {
      return openTags.map((t) => `<${t}>`).join("");
    }

    function flushChunk() {
      if (!chunkToks.length) return;
      // build HTML for this chunk: its tokens + any necessary closers
      const htmlChunk = chunkToks.map((t) => t.content).join("") + closeAll();
      chunks.push(htmlChunk);
      // prepare the next chunk: reopen whatever tags remain open
      chunkToks = openTags.length
        ? [{ type: "tag", content: reopenAll() }]
        : [];
      wordCount = 0;
    }

    tokens.forEach((tok) => {
      chunkToks.push(tok);
      if (tok.type === "tag") {
        if (!tok.isClosing) {
          openTags.push(tok.tagName);
        } else {
          // pop matching opener
          const idx = openTags.lastIndexOf(tok.tagName);
          if (idx > -1) openTags.splice(idx, 1);
        }
      } else {
        wordCount++;
      }

      if (wordCount >= chunkSize) flushChunk();
    });

    // leftover
    flushChunk();
    return chunks;
  }

  function typeByHTMLChunks($el, html, size = chunkSize) {
    $el.html("");
    const chunks = splitHTMLIntoChunks(html, size);

    return new Promise((resolve) => {
      let i = 0;
      (function next() {
        if (i < chunks.length) {
          $el.html($el.html() + chunks[i++]);
          setTimeout(next, chunkDelay);
        } else {
          resolve();
        }
      })();
    });
  }

  function initRichTyping(wrapperSelector) {
    const $w = $(wrapperSelector);
    const $ans = $w.find(".gia-answer");
    const $inv = $ans.find(".invisible-answer");
    const $aText = $ans.find(".gia-text");
    const $aCaret = $ans.find(".gia-caret");
    const $pulse = $w.find(".yellow-gia-pulse");
    const $bg = $w.find(".yellow-gia-animated-bg");
    var giaDelay = 2700;
    if ($ans.hasClass("no-pause")) {
      giaDelay = 100;
    }

    // build an array of {type, html}
    const chunks = [];
    $inv.contents().each(function () {
      if (this.nodeType === Node.ELEMENT_NODE && $(this).is("p")) {
        const html = $(this).html().trim();
        if (html) chunks.push({ type: "p", html });
      } else if (this.nodeType === Node.ELEMENT_NODE && $(this).is("ul")) {
        $(this)
          .find("li")
          .each(function () {
            const html = $(this).html().trim();
            if (html) chunks.push({ type: "li", html });
          });
      } else if (this.nodeType === Node.TEXT_NODE) {
        const txt = $(this).text().trim();
        if (txt) chunks.push({ type: "text", html: txt });
      }
    });

    // fallback if nothing found
    if (!chunks.length) {
      const html = $inv.html().trim();
      if (html) chunks.push({ type: "text", html });
    }

    let started = false;
    const obs = new IntersectionObserver(
      (entries) => {
        entries.forEach((ent) => {
          if (ent.isIntersecting && !started) {
            started = true;
            $pulse.addClass("start-pulse");
            setTimeout(() => $bg.addClass("expanded"), 700);

            setTimeout(async () => {
              $aCaret.addClass("blinking");
              $aText.empty();

              for (let i = 0; i < chunks.length; i++) {
                const { type, html } = chunks[i];
                const $span = $("<span>").addClass(type).appendTo($aText);

                // get plain-text word count
                const plainWords = html
                  .replace(/<[^>]+>/g, "")
                  .split(/\s+/)
                  .filter(Boolean);
                const wordCount = plainWords.length;

                await typeByHTMLChunks($span, html, chunkSize);

                if (i < chunks.length - 1) {
                  $aText.append("<br><br>");
                  await new Promise((r) => setTimeout(r, 200));
                }
              }

              $aCaret.removeClass("blinking");
            }, giaDelay);

            obs.disconnect();
          }
        });
      },
      { threshold: 0.1 }
    );

    const node = document.querySelector(wrapperSelector);
    if (node) obs.observe(node);
  }

  $(".gia-answer").each(function () {
    const $ans = $(this);
    // climb up two levels to the #answer-outer-* container
    const $wrapper = $ans.parent().parent();
    if (!$wrapper.length) return;
    initRichTyping("#" + $wrapper.attr("id"));
  });

  //end gia text animation code
});

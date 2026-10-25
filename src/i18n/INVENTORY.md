# i18n string inventory (source for phase P3)

**Generated:** 2026-10-25 · **Phase:** P0-1/P0-2 of `docs/plans/2026-10-22-i18n-plan.md`
**Method:** mechanical scan of `src/**/*.{ts,tsx}` (tests and `src/i18n/` excluded)
for user-facing literals in the categories below, plus a dynamic-call-site pass.
**Origin column is a heuristic** (EN word list / voseo patterns / Spanish
morphology) — values ending in `?` need human confirmation during the P3
burn-down; `AR (voseo)` rows must be re-worded to neutral ES in P1/P3.

## Freeze rule (P0-3)

**No new user-facing literals in `src/` from this point on.** New strings go
straight to the `es` catalogues (namespace below) with a key — AGENTS §24/§4.

## Namespace mapping (proposed)

| Path pattern | Namespace |
|---|---|
| `components/Navbar*, components/layout/*` | `nav` |
| `context/AuthContext, components/Auth*, pages/Login` | `auth` |
| `components/game/*, views/GameView, views/game/*` | `game` |
| `components/list-editor/*` | `editor` |
| `onboarding/*` | `onboarding` |
| `*Settings*` | `settings` |
| `DeckStore*/Create*Deck*/prebuilt/catalog` | `store` |
| `views/Dashboard, components/cards/*, list widgets` | `dashboard` |
| `Toast/ErrorBoundary/useAppHandlers/useListEditorActions` | `errors` |
| everything else (incl. `LandingPage`, legal views) | `common` |

## Summary

| Metric | Value |
|---|---|
| Literal rows | **1132** across **110** files |
| Dynamic call sites (trace source in P3) | **48** |
| By category | jsx-text: 672 · expr: 98 · toast: 45 · label: 56 · title: 7 · aria-label: 48 · placeholder: 29 · field: 157 · const-string: 12 · auth-error: 8 |
| By origin (heuristic) | EN: 127 · ES?: 456 · EN?: 95 · neutral?: 178 · ES-neutral: 258 · AR (voseo): 13 · do-not-translate (email): 4 · symbol (do-not-translate): 1 |
| By namespace | common: 574 · nav: 36 · auth: 33 · errors: 53 · dashboard: 26 · editor: 87 · store: 126 · onboarding: 73 · settings: 45 · game: 79 |

**Deferred** (not extraction targets): `document.title`/meta per-route strings
(P3-3 → SEO phase), emails (do-not-translate), brand "Glimmind" (do-not-translate),
legal long-form views (localization handled in the SEO/legal phase).

---

## Literal inventory

### common (574)

**src/App.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 196 | expr | `Mazo creado` | ES? | `common.mazo_creado` |
| 196 | expr | `{{…}} mazos creados` | ES? | `common.mazos_creados` |
| 213 | jsx-text | `Loading...` | EN | `common.loading` |
| 282 | expr | `Volver al juego` | ES? | `common.volver_al_juego` |
| 282 | expr | `Volver al dashboard` | EN | `common.volver_al_dashboard` |
| 320 | jsx-text | `Loading deck...` | EN | `common.loading_deck` |
| 388 | expr | `Sin nombre` | ES? | `common.sin_nombre` |

**src/components/ListEditor.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 145 | toast | `⚠️ Ponle un nombre a tu mazo antes de guardar.` | ES? | `common.ponle_un_nombre_a_tu_mazo_antes_de_guardar` |
| 158 | toast | `Mazo creado` | ES? | `common.mazo_creado_2` |
| 279 | jsx-text | `Tarjetas Archivadas` | ES? | `common.tarjetas_archivadas` |
| 282 | jsx-text | `Estas tarjetas ya no aparecen en tus partidas. Puedes restaurarlas en cualquier momento.` | EN? | `common.estas_tarjetas_ya_no_aparecen_en_tus_parti` |

**src/components/ProtectedRoute.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 35 | jsx-text | `Loading...` | EN | `common.loading_2` |

**src/components/modals/AttemptAnalysisModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 135 | aria-label | `Cerrar` | ES? | `common.cerrar` |
| 151 | jsx-text | `📝 Frase completa` | ES? | `common.frase_completa` |
| 173 | jsx-text | `⚙️ Regla: ignoreArticles = true → palabras como "in", "the", "we" se ignoran en la comparación` | ES-neutral | `common.regla_ignorearticles_true_palabras_como_in` |
| 183 | jsx-text | `La respuesta esperada parece tener un typo. Tu respuesta es correcta, pero el sistema tiene un error de escritura.` | EN? | `common.la_respuesta_esperada_parece_tener_un_typo` |
| 191 | jsx-text | `🔬 Comparación palabra por palabra` | ES-neutral | `common.comparacion_palabra_por_palabra` |
| 200 | jsx-text | `Tu respuesta` | ES? | `common.tu_respuesta` |
| 201 | jsx-text | `Sistema` | neutral? | `common.sistema` |
| 202 | jsx-text | `Estado` | ES? | `common.estado` |
| 252 | jsx-text | `Pos` | neutral? | `common.pos` |
| 253 | jsx-text | `Tu letra` | ES? | `common.tu_letra` |
| 254 | jsx-text | `Sistema` | neutral? | `common.sistema` |
| 255 | jsx-text | `Tipo` | neutral? | `common.tipo` |
| 315 | jsx-text | `📊 Desglose del puntaje` | ES? | `common.desglose_del_puntaje` |
| 320 | jsx-text | `Distancia` | neutral? | `common.distancia` |
| 326 | jsx-text | `Caracteres` | neutral? | `common.caracteres` |
| 334 | jsx-text | `Diferencias` | neutral? | `common.diferencias` |
| 340 | jsx-text | `Umbral` | neutral? | `common.umbral` |
| 351 | jsx-text | `Similitud calculada` | ES? | `common.similitud_calculada` |
| 366 | expr | `✅ Pasa` | neutral? | `common.pasa` |
| 366 | expr | `❌ No pasa` | EN | `common.no_pasa` |
| 376 | jsx-text | `✏️ Corregir respuesta esperada` | ES? | `common.corregir_respuesta_esperada` |
| 382 | jsx-text | `Si crees que la respuesta esperada tiene un typo, puedes corregirla usando tu respuesta como base.` | ES? | `common.si_crees_que_la_respuesta_esperada_tiene_u` |
| 389 | jsx-text | `Corregir respuesta esperada` | ES? | `common.corregir_respuesta_esperada` |
| 396 | expr | `término` | ES-neutral | `common.termino` |
| 396 | expr | `definición` | ES-neutral | `common.definicion` |
| 411 | expr | `Guardar corrección` | ES-neutral | `common.guardar_correccion` |
| 416 | jsx-text | `Cancelar` | ES? | `common.cancelar` |

**src/components/modals/DeleteConfirmationModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 30 | jsx-text | `Eliminar mazo` | ES? | `common.eliminar_mazo` |
| 32 | jsx-text | `Esta acción no se puede deshacer.` | ES-neutral | `common.esta_accion_no_se_puede_deshacer` |
| 36 | jsx-text | `¿Estás seguro de que quieres eliminar` | ES-neutral | `common.estas_seguro_de_que_quieres_eliminar` |
| 37 | jsx-text | `? Se eliminarán todas sus tarjetas permanentemente.` | ES-neutral | `common.se_eliminaran_todas_sus_tarjetas_permanent` |
| 47 | expr | `Sí, eliminar` | ES-neutral | `common.si_eliminar` |
| 53 | jsx-text | `Cancelar` | ES? | `common.cancelar_2` |

**src/components/modals/EditCardModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 75 | aria-label | `Editar tarjeta` | ES? | `common.editar_tarjeta` |
| 80 | jsx-text | `Editar tarjeta` | ES? | `common.editar_tarjeta` |
| 92 | placeholder | `Term` | neutral? | `common.term` |
| 104 | placeholder | `Definition` | neutral? | `common.definition` |
| 112 | jsx-text | `Guardar` | ES? | `common.guardar` |
| 118 | jsx-text | `Cancelar` | ES? | `common.cancelar_3` |
| 126 | aria-label | `Eliminar tarjeta` | ES? | `common.eliminar_tarjeta` |
| 130 | jsx-text | `Eliminar tarjeta` | ES? | `common.eliminar_tarjeta` |

**src/components/modals/QuickAddModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 123 | jsx-text | `Agregar Valor` | ES? | `common.agregar_valor` |
| 125 | jsx-text | `Busca si ya existe o crea un nuevo valor en la mejor lista.` | ES? | `common.busca_si_ya_existe_o_crea_un_nuevo_valor_e` |
| 131 | jsx-text | `Buscar valor` | ES? | `common.buscar_valor` |
| 137 | placeholder | `Escribe un valor o su definición...` | ES-neutral | `common.escribe_un_valor_o_su_definicion` |
| 162 | jsx-text | `Sin resultados. Puedes crear este valor a continuación.` | ES-neutral | `common.sin_resultados_puedes_crear_este_valor_a_c` |
| 169 | jsx-text | `No lo encuentro, crear nuevo` | EN? | `common.no_lo_encuentro_crear_nuevo` |
| 175 | jsx-text | `Cancelar` | ES? | `common.cancelar_4` |
| 184 | jsx-text | `Ya existe en la lista` | ES? | `common.ya_existe_en_la_lista` |
| 192 | jsx-text | `Valor` | neutral? | `common.valor` |
| 198 | placeholder | `ej: go` | ES? | `common.ej_go` |
| 203 | jsx-text | `Esperado` | neutral? | `common.esperado` |
| 209 | placeholder | `ej: ir` | ES? | `common.ej_ir` |
| 217 | jsx-text | `Lista sugerida` | ES? | `common.lista_sugerida` |
| 219 | jsx-text | `No hay listas disponibles para sugerir.` | EN? | `common.no_hay_listas_disponibles_para_sugerir` |
| 242 | expr | `Sin coincidencias, distribuido por carga` | ES? | `common.sin_coincidencias_distribuido_por_carga` |
| 257 | jsx-text | `Crear nueva lista` | ES? | `common.crear_nueva_lista` |
| 258 | jsx-text | `Guardar este valor en una lista nueva` | ES? | `common.guardar_este_valor_en_una_lista_nueva` |
| 269 | jsx-text | `Agregar valor` | ES? | `common.agregar_valor` |
| 275 | jsx-text | `Cancelar` | ES? | `common.cancelar_4` |
| 282 | jsx-text | `Nueva lista` | ES? | `common.nueva_lista` |
| 285 | jsx-text | `Nombre de la lista` | ES? | `common.nombre_de_la_lista` |
| 291 | placeholder | `ej: Verbos irregulares` | ES? | `common.ej_verbos_irregulares` |
| 296 | jsx-text | `Concepto / tema` | ES? | `common.concepto_tema` |
| 302 | placeholder | `ej: Inglés` | ES-neutral | `common.ej_ingles` |
| 314 | expr | `Crear lista y agregar valor` | ES? | `common.crear_lista_y_agregar_valor` |
| 320 | jsx-text | `Cancelar` | ES? | `common.cancelar_4` |

**src/components/modals/VocabularyPreview.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 52 | jsx-text | `Vocabulary preview` | ES? | `common.vocabulary_preview` |
| 53 | expr | `Texto manual` | ES? | `common.texto_manual` |
| 55 | jsx-text | `Video truncado a la primera hora de contenido` | ES? | `common.video_truncado_a_la_primera_hora_de_conten` |
| 70 | jsx-text | `Nombre del mazo X:` | ES? | `common.nombre_del_mazo_x` |
| 78 | placeholder | `Nombre del mazo X` | ES? | `common.nombre_del_mazo_x` |
| 88 | jsx-text | `value1` | neutral? | `common.value1` |
| 89 | jsx-text | `Traducción` | ES-neutral | `common.traduccion` |
| 90 | jsx-text | `tags` | neutral? | `common.tags` |
| 106 | jsx-text | `Sin traducción` | ES-neutral | `common.sin_traduccion` |
| 125 | title | `Ver contexto` | ES? | `common.ver_contexto` |
| 137 | jsx-text | `Contexto:` | neutral? | `common.contexto` |
| 149 | jsx-text | `Cerrar` | ES? | `common.cerrar_2` |

**src/components/modals/settings/AnswerValidationSection.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 24 | jsx-text | `Answer Validation` | ES? | `common.answer_validation` |
| 30 | jsx-text | `Ignore articles` | ES? | `common.ignore_articles` |
| 31 | jsx-text | `the, at, to, el, la... not required` | EN | `common.the_at_to_el_la_not_required` |

**src/components/modals/settings/GameModeSection.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 14 | jsx-text | `Game Mode` | ES? | `common.game_mode` |
| 25 | jsx-text | `Practice` | neutral? | `common.practice` |
| 35 | jsx-text | `Real` | neutral? | `common.real` |

**src/components/modals/settings/VoiceCommandsSection.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 39 | jsx-text | `Voice commands` | ES? | `common.voice_commands` |
| 42 | jsx-text | `Comma-separated keywords, recognized in the answer language.` | EN | `common.comma_separated_keywords_recognized_in_the` |
| 59 | aria-label | `Voice command ${id` | ES? | `common.voice_command_id` |

**src/components/modals/settings/VoiceSection.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 15 | label | `🇪🇸 Español` | ES-neutral | `common.espanol` |
| 16 | label | `🇬🇧 Inglés` | ES-neutral | `common.ingles` |
| 17 | label | `🇫🇷 Francés` | ES-neutral | `common.frances` |
| 18 | label | `🇩🇪 Alemán` | ES-neutral | `common.aleman` |
| 19 | label | `🇮🇹 Italiano` | neutral? | `common.italiano` |
| 20 | label | `🇧🇷 Portugués` | ES-neutral | `common.portugues` |
| 38 | expr | `• default` | neutral? | `common.default` |
| 90 | jsx-text | `Voice` | neutral? | `common.voice` |
| 96 | jsx-text | `Enable voice` | ES? | `common.enable_voice` |
| 97 | jsx-text | `Pronounce the word and listen to your answer` | EN | `common.pronounce_the_word_and_listen_to_your_answ` |
| 106 | aria-label | `Toggle voice` | ES? | `common.toggle_voice` |
| 119 | jsx-text | `TTS Provider` | ES? | `common.tts_provider` |
| 126 | label | `Browser` | neutral? | `common.browser` |
| 128 | label | `Chirp 3 HD` | ES? | `common.chirp_3_hd` |
| 132 | jsx-text | `Calidad premium · fallback automático a browser si se agota la cuota` | ES-neutral | `common.calidad_premium_fallback_automatico_a_brow` |
| 139 | jsx-text | `STT Provider` | ES? | `common.stt_provider` |
| 146 | label | `Browser` | neutral? | `common.browser` |
| 148 | label | `Chiptt` | neutral? | `common.chiptt` |
| 149 | label | `Vosk` | neutral? | `common.vosk` |
| 153 | jsx-text | `Calidad premium · requiere grabación de audio` | ES-neutral | `common.calidad_premium_requiere_grabacion_de_audi` |
| 160 | expr | `Reconocimiento offline · requiere conexión solo para descargar el modelo (~41MB)` | ES-neutral | `common.reconocimiento_offline_requiere_conexion_s` |
| 296 | jsx-text | `Auto (por idioma)` | ES? | `common.auto_por_idioma` |
| 300 | jsx-text | `Cargando voces...` | ES? | `common.cargando_voces` |
| 321 | aria-label | `Probar voz de ${label` | ES? | `common.probar_voz_de_label` |

**src/components/views/AdminUsageView.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 49 | field | `Error loading usage data` | EN | `common.error_loading_usage_data` |
| 68 | aria-label | `Volver` | ES? | `common.volver` |
| 76 | jsx-text | `Admin Usage Dashboard` | EN | `common.admin_usage_dashboard` |
| 77 | jsx-text | `Consumo de servicios por usuario y global.` | ES? | `common.consumo_de_servicios_por_usuario_y_global` |
| 80 | jsx-text | `Mes:` | neutral? | `common.mes` |
| 113 | jsx-text | `Global Usage` | ES? | `common.global_usage` |
| 123 | jsx-text | `Per-User Usage` | ES? | `common.per_user_usage` |
| 125 | jsx-text | `No hay usuarios con uso este mes.` | EN? | `common.no_hay_usuarios_con_uso_este_mes` |

**src/components/views/CookiePolicy.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | jsx-text | `Back to Glimmind` | EN | `common.back_to_glimmind` |
| 14 | jsx-text | `Cookie Policy` | ES? | `common.cookie_policy` |
| 15 | jsx-text | `Last updated: October 2026` | ES? | `common.last_updated_october_2026` |
| 19 | jsx-text | `1. What Are Cookies` | EN | `common.1_what_are_cookies` |
| 20 | jsx-text | `Cookies are small text files stored on your device when you visit a website. They help the site remember your preferences and improve your experience.` | EN? | `common.cookies_are_small_text_files_stored_on_you` |
| 24 | jsx-text | `2. Cookies We Use` | ES? | `common.2_cookies_we_use` |
| 25 | jsx-text | `Glimmind uses only essential cookies. We do not use tracking, advertising, or analytics cookies.` | EN? | `common.glimmind_uses_only_essential_cookies_we_do` |
| 30 | jsx-text | `Name` | neutral? | `common.name` |
| 31 | jsx-text | `Purpose` | neutral? | `common.purpose` |
| 32 | jsx-text | `Duration` | neutral? | `common.duration` |
| 33 | jsx-text | `Type` | neutral? | `common.type` |
| 38 | jsx-text | `firebaseAuthToken` | neutral? | `common.firebaseauthtoken` |
| 39 | jsx-text | `Stores Firebase authentication token for session persistence` | EN? | `common.stores_firebase_authentication_token_for_s` |
| 40 | jsx-text | `Session / 1 hour (refreshed)` | EN | `common.session_1_hour_refreshed` |
| 41 | jsx-text | `Essential` | neutral? | `common.essential` |
| 44 | jsx-text | `glimmind_*` | neutral? | `common.glimmind` |
| 45 | jsx-text | `localStorage keys for flashcards, settings, progress (not cookies)` | EN | `common.localstorage_keys_for_flashcards_settings_` |
| 46 | jsx-text | `Persistent (until cleared)` | ES? | `common.persistent_until_cleared` |
| 47 | jsx-text | `Local storage` | ES? | `common.local_storage` |
| 50 | jsx-text | `__session` | EN | `common.session` |
| 51 | jsx-text | `Firebase Auth session cookie (HttpOnly, Secure)` | EN? | `common.firebase_auth_session_cookie_httponly_secu` |
| 52 | jsx-text | `Session` | EN | `common.session` |
| 53 | jsx-text | `Essential` | neutral? | `common.essential` |
| 60 | jsx-text | `3. Local Storage (Not Cookies)` | EN? | `common.3_local_storage_not_cookies` |
| 61 | jsx-text | `Glimmind is local-first. Most data lives in your browser's localStorage, not cookies:` | EN? | `common.glimmind_is_local_first_most_data_lives_in` |
| 63 | jsx-text | `Flashcards, decks, and cycle progression state` | EN | `common.flashcards_decks_and_cycle_progression_sta` |
| 64 | jsx-text | `User preferences (theme, voice settings, game mode)` | EN? | `common.user_preferences_theme_voice_settings_game` |
| 65 | jsx-text | `Game progress, statistics, review history` | EN | `common.game_progress_statistics_review_history` |
| 66 | jsx-text | `Offline queue for cloud sync` | ES? | `common.offline_queue_for_cloud_sync` |
| 68 | jsx-text | `You can clear all local data anytime in Settings → Clear Local Data.` | EN | `common.you_can_clear_all_local_data_anytime_in_se` |
| 72 | jsx-text | `4. Third-Party Cookies` | ES? | `common.4_third_party_cookies` |
| 73 | jsx-text | `We do not set third-party cookies. However, these services may set their own when you interact with them:` | EN? | `common.we_do_not_set_third_party_cookies_however_` |
| 75 | jsx-text | `Google Firebase Auth:` | ES? | `common.google_firebase_auth` |
| 75 | jsx-text | `Sets authentication cookies for Google OAuth` | ES? | `common.sets_authentication_cookies_for_google_oau` |
| 76 | jsx-text | `Stripe (Premium only):` | ES? | `common.stripe_premium_only` |
| 76 | jsx-text | `Sets cookies during checkout for fraud prevention` | ES? | `common.sets_cookies_during_checkout_for_fraud_pre` |
| 77 | jsx-text | `Google Cloud TTS/STT:` | ES? | `common.google_cloud_tts_stt` |
| 82 | jsx-text | `5. Managing Cookies` | ES? | `common.5_managing_cookies` |
| 83 | jsx-text | `You can control cookies via your browser settings:` | EN | `common.you_can_control_cookies_via_your_browser_s` |
| 85 | jsx-text | `Block all cookies (may break login/sync)` | EN? | `common.block_all_cookies_may_break_login_sync` |
| 86 | jsx-text | `Clear cookies on exit` | ES? | `common.clear_cookies_on_exit` |
| 87 | jsx-text | `Allow only essential cookies` | ES? | `common.allow_only_essential_cookies` |
| 89 | jsx-text | `Note: Blocking Firebase auth cookies will prevent cloud sync and require re-login each session.` | EN? | `common.note_blocking_firebase_auth_cookies_will_p` |
| 93 | jsx-text | `6. Consent` | neutral? | `common.6_consent` |
| 94 | jsx-text | `By using Glimmind with cookies enabled in your browser, you consent to the essential cookies described above. We do not require opt-in for non-essential cookies because we don't use them.` | EN? | `common.by_using_glimmind_with_cookies_enabled_in_` |
| 98 | jsx-text | `7. Changes` | neutral? | `common.7_changes` |
| 99 | jsx-text | `We may update this policy. Changes posted here with updated date.` | EN? | `common.we_may_update_this_policy_changes_posted_h` |
| 103 | jsx-text | `8. Contact` | EN | `common.8_contact` |
| 104 | jsx-text | `Questions? Email` | EN | `common.questions_email` |
| 104 | jsx-text | `privacy@glimmind.com` | do-not-translate (email) | `common.privacy_glimmind_com` |
| 109 | jsx-text | `← Back to Glimmind` | EN | `common.back_to_glimmind` |

**src/components/views/LandingDemo.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 38 | expr | `landing-demo-feedback landing-demo-feedback-correct` | ES? | `common.landing_demo_feedback_landing_demo_feedbac` |
| 53 | jsx-text | `correctas` | neutral? | `common.correctas` |
| 91 | expr | `✓ Correcto` | ES? | `common.correcto` |
| 91 | expr | `✗ Incorrecto` | ES? | `common.incorrecto` |
| 107 | placeholder | `Escribe tu respuesta...` | ES? | `common.escribe_tu_respuesta` |
| 108 | aria-label | `Escribe tu respuesta` | ES? | `common.escribe_tu_respuesta` |
| 110 | jsx-text | `VALIDAR` | neutral? | `common.validar` |
| 121 | jsx-text | `Revelar` | neutral? | `common.revelar` |
| 129 | jsx-text | `Siguiente →` | ES? | `common.siguiente` |
| 134 | jsx-text | `Prueba con un typo. Si coincide el 80% de los caracteres, cuenta como acierto.` | ES? | `common.prueba_con_un_typo_si_coincide_el_80_de_lo` |

**src/components/views/LandingPage.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 23 | jsx-text | `Sistema de 4 ciclos` | ES? | `common.sistema_de_4_ciclos` |
| 24 | jsx-text | `Mientras Duolingo te da puntos,` | ES? | `common.mientras_duolingo_te_da_puntos` |
| 24 | jsx-text | `Glimmind te hace recordar` | ES? | `common.glimmind_te_hace_recordar` |
| 25 | jsx-text | `Sistema de 4 ciclos · Validación difusa · Voz. Aprende el vocabulario que realmente necesitas.` | ES-neutral | `common.sistema_de_4_ciclos_validacion_difusa_voz_` |
| 29 | jsx-text | `Empezar gratis` | ES? | `common.empezar_gratis` |
| 30 | jsx-text | `Ver demo` | ES? | `common.ver_demo` |
| 40 | jsx-text | `Cómo se mueve una palabra` | ES-neutral | `common.como_se_mueve_una_palabra` |
| 42 | jsx-text | `Con Siguiente la palabra sube de ciclo. Si la aciertas a la primera, queda aprendida. Sin fechas ocultas ni algoritmos: ves en qué ciclo está cada palabra y por qué está ahí.` | ES-neutral | `common.con_siguiente_la_palabra_sube_de_ciclo_si_` |
| 103 | jsx-text | `STAGE 01` | neutral? | `common.stage_01` |
| 104 | jsx-text | `NUEVA` | ES? | `common.nueva` |
| 105 | jsx-text | `Todavía no ha avanzado de ciclo.` | ES-neutral | `common.todavia_no_ha_avanzado_de_ciclo` |
| 108 | jsx-text | `STAGE 02` | neutral? | `common.stage_02` |
| 109 | jsx-text | `VISTA` | ES? | `common.vista` |
| 110 | jsx-text | `Avanzó una vez y sigue en camino.` | ES-neutral | `common.avanzo_una_vez_y_sigue_en_camino` |
| 113 | jsx-text | `STAGE 03` | neutral? | `common.stage_03` |
| 114 | jsx-text | `RECONOCIDA` | neutral? | `common.reconocida` |
| 115 | jsx-text | `Avanzó dos veces. Ya debería sonarte.` | ES-neutral | `common.avanzo_dos_veces_ya_deberia_sonarte` |
| 118 | jsx-text | `STAGE 04` | neutral? | `common.stage_04` |
| 119 | jsx-text | `FRECUENTE` | ES? | `common.frecuente` |
| 120 | jsx-text | `Avanzó tres veces: es el ciclo tope.` | ES-neutral | `common.avanzo_tres_veces_es_el_ciclo_tope` |
| 124 | jsx-text | `La regla, completa` | ES? | `common.la_regla_completa` |
| 139 | jsx-text | `Validación difusa` | ES-neutral | `common.validacion_difusa` |
| 143 | jsx-text | `exactamente dónde fallaste` | ES-neutral | `common.exactamente_donde_fallaste` |
| 149 | jsx-text | `Por qué Glimmind` | ES-neutral | `common.por_que_glimmind` |
| 150 | jsx-text | `Para quienes quieren recordar, no coleccionar puntos.` | EN? | `common.para_quienes_quieren_recordar_no_coleccion` |
| 151 | jsx-text | `No vas a aprender 5.000 palabras en una semana. Vas a aprender las que necesitas. Y vas a recordarlas.` | EN? | `common.no_vas_a_aprender_5_000_palabras_en_una_se` |
| 158 | jsx-text | `La palabra no desaparece` | EN? | `common.la_palabra_no_desaparece` |
| 159 | jsx-text | `En otras apps fallas una vez y la palabra se va. Aquí` | ES-neutral | `common.en_otras_apps_fallas_una_vez_y_la_palabra_` |
| 160 | jsx-text | `entra a un ciclo` | ES? | `common.entra_a_un_ciclo` |
| 160 | jsx-text | `. Y después a otro.` | ES-neutral | `common.y_despues_a_otro` |
| 161 | jsx-text | `Hasta que se queda` | ES? | `common.hasta_que_se_queda` |
| 161 | jsx-text | `. Sin intervalos arbitrarios.` | ES? | `common.sin_intervalos_arbitrarios` |
| 166 | jsx-text | `Dos formas de practicar` | ES? | `common.dos_formas_de_practicar` |
| 168 | jsx-text | `Modo examen:` | ES? | `common.modo_examen` |
| 168 | jsx-text | `escribes la respuesta y el sistema valida.` | ES? | `common.escribes_la_respuesta_y_el_sistema_valida` |
| 169 | jsx-text | `Modo práctica:` | ES-neutral | `common.modo_practica` |
| 169 | jsx-text | `piensas, revelas y te autoevalúas.` | ES-neutral | `common.piensas_revelas_y_te_autoevaluas` |
| 170 | jsx-text | `Cambia cuando quieras.` | ES? | `common.cambia_cuando_quieras` |
| 175 | jsx-text | `No te castigamos por un typo` | EN? | `common.no_te_castigamos_por_un_typo` |
| 176 | jsx-text | `Escribiste` | neutral? | `common.escribiste` |
| 177 | jsx-text | `dividens` | neutral? | `common.dividens` |
| 177 | jsx-text | `, el sistema esperaba` | ES? | `common.el_sistema_esperaba` |
| 177 | jsx-text | `dividends` | neutral? | `common.dividends` |
| 177 | jsx-text | `. Coincidencia:` | neutral? | `common.coincidencia` |
| 178 | jsx-text | `. Cuenta como acierto. Recordar no es un examen de ortografía.` | ES-neutral | `common.cuenta_como_acierto_recordar_no_es_un_exam` |
| 183 | jsx-text | `Aprende hablando, no solo escribiendo` | EN? | `common.aprende_hablando_no_solo_escribiendo` |
| 184 | jsx-text | `Practica` | neutral? | `common.practica` |
| 185 | jsx-text | `manos libres` | ES? | `common.manos_libres` |
| 185 | jsx-text | `. Di la respuesta en voz alta y el sistema la escucha.` | ES? | `common.di_la_respuesta_en_voz_alta_y_el_sistema_l` |
| 186 | jsx-text | `Funciona sin conexión` | ES-neutral | `common.funciona_sin_conexion` |
| 186 | jsx-text | `. Comandos: revelar, pasar, parar.` | ES? | `common.comandos_revelar_pasar_parar` |
| 191 | jsx-text | `En tu navegador, tu tablet, tu teléfono` | ES-neutral | `common.en_tu_navegador_tu_tablet_tu_telefono` |
| 192 | jsx-text | `Web, iOS y Android.` | ES? | `common.web_ios_y_android` |
| 193 | jsx-text | `El mismo progreso en todos lados` | ES? | `common.el_mismo_progreso_en_todos_lados` |
| 194 | jsx-text | `Funciona offline` | ES? | `common.funciona_offline` |
| 194 | jsx-text | `. Si tienes cuenta, sincroniza.` | ES? | `common.si_tienes_cuenta_sincroniza` |
| 199 | jsx-text | `Tus datos se quedan contigo` | ES? | `common.tus_datos_se_quedan_contigo` |
| 200 | jsx-text | `Todo` | neutral? | `common.todo` |
| 201 | jsx-text | `vive en tu dispositivo` | ES? | `common.vive_en_tu_dispositivo` |
| 201 | jsx-text | `. La nube es opcional.` | ES? | `common.la_nube_es_opcional` |
| 202 | jsx-text | `Sin tracking, sin anuncios, sin vender tus datos.` | ES? | `common.sin_tracking_sin_anuncios_sin_vender_tus_d` |
| 209 | jsx-text | `Precios` | neutral? | `common.precios` |
| 210 | jsx-text | `Simple y honesto.` | ES? | `common.simple_y_honesto` |
| 211 | jsx-text | `Empieza gratis. Actualiza cuando lo necesites. Sin sorpresas.` | ES? | `common.empieza_gratis_actualiza_cuando_lo_necesit` |
| 217 | jsx-text | `Free` | neutral? | `common.free` |
| 220 | jsx-text | `para siempre` | ES? | `common.para_siempre` |
| 222 | jsx-text | `Para empezar sin compromiso.` | ES? | `common.para_empezar_sin_compromiso` |
| 224 | jsx-text | `1.000 tarjetas` | ES? | `common.1_000_tarjetas` |
| 224 | jsx-text | `activas` | neutral? | `common.activas` |
| 225 | jsx-text | `Mazos ilimitados` | ES? | `common.mazos_ilimitados` |
| 226 | jsx-text | `Modo examen y práctica` | ES-neutral | `common.modo_examen_y_practica` |
| 227 | jsx-text | `Estudio con voz (navegador)` | ES? | `common.estudio_con_voz_navegador` |
| 228 | jsx-text | `Tus datos viven en tu dispositivo` | ES? | `common.tus_datos_viven_en_tu_dispositivo` |
| 229 | jsx-text | `Sincronización con Google` | ES-neutral | `common.sincronizacion_con_google` |
| 230 | jsx-text | `Importa desde CSV, texto o YouTube` | ES? | `common.importa_desde_csv_texto_o_youtube` |
| 232 | jsx-text | `Empezar gratis` | ES? | `common.empezar_gratis` |
| 236 | jsx-text | `Más elegido` | ES-neutral | `common.mas_elegido` |
| 237 | jsx-text | `Premium` | ES? | `common.premium` |
| 240 | jsx-text | `una vez` | ES? | `common.una_vez` |
| 242 | jsx-text | `Para quienes estudian en serio. Pagás una sola vez.` | ES-neutral | `common.para_quienes_estudian_en_serio_pagas_una_s` |
| 244 | jsx-text | `5.000 tarjetas` | ES? | `common.5_000_tarjetas` |
| 244 | jsx-text | `activas` | neutral? | `common.activas` |
| 245 | jsx-text | `Todo lo de Free` | ES? | `common.todo_lo_de_free` |
| 246 | jsx-text | `Sincronización prioritaria` | ES-neutral | `common.sincronizacion_prioritaria` |
| 247 | jsx-text | `Voces HD` | ES? | `common.voces_hd` |
| 247 | jsx-text | `(Chirp 3)` | neutral? | `common.chirp_3` |
| 248 | jsx-text | `Estadísticas avanzadas` | ES-neutral | `common.estadisticas_avanzadas` |
| 249 | jsx-text | `Exporta todos tus datos` | ES? | `common.exporta_todos_tus_datos` |
| 250 | jsx-text | `Soporte prioritario` | ES? | `common.soporte_prioritario` |
| 252 | jsx-text | `Probar Premium` | ES? | `common.probar_premium` |
| 258 | jsx-text | `Sin anuncios. Sin tracking. Sin vender tus datos.` | ES? | `common.sin_anuncios_sin_tracking_sin_vender_tus_d` |
| 263 | jsx-text | `¿Listo para recordar de verdad?` | ES-neutral | `common.listo_para_recordar_de_verdad` |
| 264 | jsx-text | `Crea tu primer mazo gratis. Toma menos de un minuto.` | ES? | `common.crea_tu_primer_mazo_gratis_toma_menos_de_u` |
| 265 | jsx-text | `Crear mi primer mazo →` | ES? | `common.crear_mi_primer_mazo` |
| 273 | jsx-text | `Glimmind` | neutral? | `common.glimmind_2` |
| 275 | jsx-text | `Flashcards con 4 ciclos visibles para aprender idiomas. Construido con React, Firebase y ciencia.` | ES? | `common.flashcards_con_4_ciclos_visibles_para_apre` |
| 280 | jsx-text | `GH` | neutral? | `common.gh` |
| 280 | aria-label | `GitHub` | neutral? | `common.github` |
| 281 | aria-label | `Twitter` | neutral? | `common.twitter` |
| 282 | jsx-text | `DC` | neutral? | `common.dc` |
| 282 | aria-label | `Discord` | neutral? | `common.discord` |
| 286 | jsx-text | `Producto` | neutral? | `common.producto` |
| 288 | jsx-text | `Dashboard` | EN | `common.dashboard` |
| 289 | jsx-text | `Precios` | neutral? | `common.precios` |
| 290 | jsx-text | `Novedades` | neutral? | `common.novedades` |
| 291 | jsx-text | `Roadmap` | neutral? | `common.roadmap` |
| 295 | jsx-text | `Recursos` | neutral? | `common.recursos` |
| 297 | jsx-text | `Documentación` | ES-neutral | `common.documentacion` |
| 298 | jsx-text | `Guías` | ES-neutral | `common.guias` |
| 299 | jsx-text | `Estado del servicio` | ES? | `common.estado_del_servicio` |
| 300 | jsx-text | `Contacto` | neutral? | `common.contacto` |
| 304 | jsx-text | `Legal` | neutral? | `common.legal` |
| 306 | jsx-text | `Privacidad` | ES? | `common.privacidad` |
| 307 | jsx-text | `Términos` | ES-neutral | `common.terminos` |
| 308 | jsx-text | `Cookies` | neutral? | `common.cookies` |
| 309 | jsx-text | `GDPR` | neutral? | `common.gdpr` |
| 315 | jsx-text | `© 2026 Glimmind. Todos los derechos reservados.` | ES? | `common.2026_glimmind_todos_los_derechos_reservado` |
| 319 | jsx-text | `Privacidad` | ES? | `common.privacidad` |
| 320 | jsx-text | `Términos` | ES-neutral | `common.terminos` |
| 321 | jsx-text | `Cookies` | neutral? | `common.cookies` |
| 325 | jsx-text | `Todos los sistemas operativos` | ES? | `common.todos_los_sistemas_operativos` |

**src/components/views/LandingValidationAnalysis.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 53 | jsx-text | `Score` | neutral? | `common.score` |
| 56 | jsx-text | `Análisis de tu respuesta` | ES-neutral | `common.analisis_de_tu_respuesta` |
| 57 | jsx-text | `Umbral para aprobar:` | ES? | `common.umbral_para_aprobar` |
| 59 | expr | `· No alcanzaste` | EN | `common.no_alcanzaste` |
| 67 | jsx-text | `📝 Frase completa` | ES? | `common.frase_completa_2` |
| 72 | jsx-text | `🔍 Comparación palabra por palabra` | ES-neutral | `common.comparacion_palabra_por_palabra_2` |
| 77 | aria-label | `Índice` | ES-neutral | `common.indice` |
| 78 | jsx-text | `Tu respuesta` | ES? | `common.tu_respuesta_2` |
| 79 | jsx-text | `Sistema` | neutral? | `common.sistema_2` |
| 80 | jsx-text | `Estado` | ES? | `common.estado_2` |
| 113 | aria-label | `Ver detalle de la palabra ${word.index` | ES? | `common.ver_detalle_de_la_palabra_word_index` |
| 131 | jsx-text | `Tú` | ES-neutral | `common.tu` |
| 142 | jsx-text | `Sistema` | neutral? | `common.sistema_2` |
| 168 | jsx-text | `Palabras correctas` | ES? | `common.palabras_correctas` |
| 176 | jsx-text | `📊 Desglose del puntaje` | ES? | `common.desglose_del_puntaje_2` |
| 179 | jsx-text | `Distancia` | neutral? | `common.distancia_2` |
| 181 | jsx-text | `caracteres de diferencia` | ES? | `common.caracteres_de_diferencia` |
| 184 | jsx-text | `Caracteres` | neutral? | `common.caracteres_2` |
| 186 | jsx-text | `en total` | EN | `common.en_total` |
| 189 | jsx-text | `Diferencias` | neutral? | `common.diferencias_2` |
| 198 | jsx-text | `Umbral` | neutral? | `common.umbral_2` |
| 202 | jsx-text | `necesario para aprobar` | ES? | `common.necesario_para_aprobar` |
| 209 | jsx-text | `💡 Necesitas` | ES? | `common.necesitas` |

**src/components/views/PrivacyPolicy.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | jsx-text | `Back to Glimmind` | EN | `common.back_to_glimmind_2` |
| 14 | jsx-text | `Privacy Policy` | EN | `common.privacy_policy` |
| 15 | jsx-text | `Last updated: October 2026` | ES? | `common.last_updated_october_2026_2` |
| 19 | jsx-text | `1. Data We Collect` | ES? | `common.1_data_we_collect` |
| 21 | jsx-text | `Account data:` | EN | `common.account_data` |
| 21 | jsx-text | `Email, display name, profile photo (via Google OAuth)` | EN? | `common.email_display_name_profile_photo_via_googl` |
| 22 | jsx-text | `Flashcard content:` | ES? | `common.flashcard_content` |
| 22 | jsx-text | `Terms, definitions, contexts you create or import` | EN | `common.terms_definitions_contexts_you_create_or_i` |
| 23 | jsx-text | `Game progress:` | EN | `common.game_progress` |
| 23 | jsx-text | `Cycle progression state, review history, statistics` | EN | `common.cycle_progression_state_review_history_sta` |
| 24 | jsx-text | `Voice recordings:` | ES? | `common.voice_recordings` |
| 24 | jsx-text | `Optional audio recordings of your answers (only if enabled)` | EN | `common.optional_audio_recordings_of_your_answers_` |
| 25 | jsx-text | `Usage analytics:` | ES? | `common.usage_analytics` |
| 25 | jsx-text | `Feature usage, error logs, performance metrics (no personal identifiers)` | EN? | `common.feature_usage_error_logs_performance_metri` |
| 30 | jsx-text | `2. How We Use Your Data` | EN? | `common.2_how_we_use_your_data` |
| 32 | jsx-text | `Provide core flashcard functionality (sync, 4-cycle progression, voice study)` | EN? | `common.provide_core_flashcard_functionality_sync_` |
| 33 | jsx-text | `Improve the app through usage analytics` | EN? | `common.improve_the_app_through_usage_analytics` |
| 34 | jsx-text | `Enforce quotas and prevent abuse` | EN? | `common.enforce_quotas_and_prevent_abuse` |
| 35 | jsx-text | `Comply with legal obligations` | EN? | `common.comply_with_legal_obligations` |
| 40 | jsx-text | `3. Data Storage & Security` | ES? | `common.3_data_storage_security` |
| 42 | jsx-text | `Local-first:` | ES? | `common.local_first` |
| 42 | jsx-text | `All data stored in your browser's localStorage by default` | EN | `common.all_data_stored_in_your_browser_s_localsto` |
| 43 | jsx-text | `Optional cloud sync:` | EN | `common.optional_cloud_sync` |
| 43 | jsx-text | `Encrypted in transit (TLS) and at rest (Firebase)` | EN? | `common.encrypted_in_transit_tls_and_at_rest_fireb` |
| 44 | jsx-text | `Voice recordings:` | ES? | `common.voice_recordings` |
| 44 | jsx-text | `Stored in user-scoped Firebase Storage, auto-deleted` | EN? | `common.stored_in_user_scoped_firebase_storage_aut` |
| 45 | jsx-text | `No third-party data sales:` | EN? | `common.no_third_party_data_sales` |
| 45 | jsx-text | `Your data is never sold` | EN? | `common.your_data_is_never_sold` |
| 50 | jsx-text | `4. Third-Party Services` | ES? | `common.4_third_party_services` |
| 52 | jsx-text | `Firebase (Google):` | ES? | `common.firebase_google` |
| 52 | jsx-text | `Authentication, Firestore, Storage, Functions, Hosting` | ES? | `common.authentication_firestore_storage_functions` |
| 53 | jsx-text | `Google Cloud TTS/STT:` | ES? | `common.google_cloud_tts_stt_2` |
| 53 | jsx-text | `Voice synthesis & recognition (Chirp 3 HD, browser fallback)` | ES? | `common.voice_synthesis_recognition_chirp_3_hd_bro` |
| 54 | jsx-text | `Vosk:` | neutral? | `common.vosk_2` |
| 54 | jsx-text | `Offline speech recognition (runs locally in browser)` | EN? | `common.offline_speech_recognition_runs_locally_in` |
| 55 | jsx-text | `Google Cloud Translation:` | ES? | `common.google_cloud_translation` |
| 55 | jsx-text | `Card translation (Premium only)` | EN? | `common.card_translation_premium_only` |
| 56 | jsx-text | `Google Gemini:` | ES? | `common.google_gemini` |
| 56 | jsx-text | `Vocabulary extraction for AI deck generation (Premium only)` | EN? | `common.vocabulary_extraction_for_ai_deck_generati` |
| 58 | jsx-text | `These processors only access data necessary to provide their specific service.` | EN? | `common.these_processors_only_access_data_necessar` |
| 62 | jsx-text | `5. Your Rights (GDPR)` | EN | `common.5_your_rights_gdpr` |
| 64 | jsx-text | `Access:` | EN | `common.access` |
| 64 | jsx-text | `Request a copy of your data via Settings → Export Data` | EN | `common.request_a_copy_of_your_data_via_settings_e` |
| 65 | jsx-text | `Rectification:` | neutral? | `common.rectification` |
| 65 | jsx-text | `Edit any card or profile data directly in the app` | EN | `common.edit_any_card_or_profile_data_directly_in_` |
| 66 | jsx-text | `Erasure:` | neutral? | `common.erasure` |
| 66 | jsx-text | `Delete your account in Settings → Delete Account (removes all data)` | EN | `common.delete_your_account_in_settings_delete_acc` |
| 67 | jsx-text | `Portability:` | neutral? | `common.portability` |
| 67 | jsx-text | `Export all data as JSON/CSV` | EN | `common.export_all_data_as_json_csv` |
| 68 | jsx-text | `Objection:` | neutral? | `common.objection` |
| 68 | jsx-text | `Disable cloud sync or voice features anytime` | ES? | `common.disable_cloud_sync_or_voice_features_anyti` |
| 73 | jsx-text | `6. Data Retention` | ES? | `common.6_data_retention` |
| 75 | jsx-text | `Account & flashcard data: Until you delete your account` | EN | `common.account_flashcard_data_until_you_delete_yo` |
| 76 | jsx-text | `Voice recordings: Auto-deleted after 30 days` | EN? | `common.voice_recordings_auto_deleted_after_30_day` |
| 77 | jsx-text | `Analytics logs: 13 months (aggregated, non-personal)` | ES? | `common.analytics_logs_13_months_aggregated_non_pe` |
| 78 | jsx-text | `Error logs: 30 days` | EN | `common.error_logs_30_days` |
| 83 | jsx-text | `7. Children's Privacy` | EN | `common.7_children_s_privacy` |
| 84 | jsx-text | `Glimmind is not directed at children under 13. We do not knowingly collect data from children under 13.` | EN? | `common.glimmind_is_not_directed_at_children_under` |
| 88 | jsx-text | `8. Changes to This Policy` | EN? | `common.8_changes_to_this_policy` |
| 89 | jsx-text | `We may update this policy. Material changes will be notified via email or in-app notice.` | EN? | `common.we_may_update_this_policy_material_changes` |
| 93 | jsx-text | `9. Contact` | EN | `common.9_contact` |
| 94 | jsx-text | `Questions? Email` | EN | `common.questions_email_2` |
| 94 | jsx-text | `privacy@glimmind.com` | do-not-translate (email) | `common.privacy_glimmind_com_2` |
| 99 | jsx-text | `← Back to Glimmind` | EN | `common.back_to_glimmind_2` |

**src/components/views/ReportsView.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 18 | aria-label | `Volver` | ES? | `common.volver_2` |
| 26 | jsx-text | `Informes` | neutral? | `common.informes` |
| 27 | jsx-text | `Resumen de tus juegos y ranking de tarjetas.` | ES? | `common.resumen_de_tus_juegos_y_ranking_de_tarjeta` |
| 37 | jsx-text | `Resumen de juegos` | ES? | `common.resumen_de_juegos` |
| 45 | jsx-text | `Ranking` | neutral? | `common.ranking` |
| 54 | expr | `Resumen de juegos` | ES? | `common.resumen_de_juegos` |
| 54 | expr | `Ranking de tarjetas` | ES? | `common.ranking_de_tarjetas` |
| 55 | jsx-text | `Esta funcionalidad está en desarrollo. Pronto podrás ver tus estadísticas aquí.` | ES-neutral | `common.esta_funcionalidad_esta_en_desarrollo_pron` |
| 61 | jsx-text | `Ir a Configuración` | ES-neutral | `common.ir_a_configuracion` |

**src/components/views/TermsOfService.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | jsx-text | `Back to Glimmind` | EN | `common.back_to_glimmind_3` |
| 14 | jsx-text | `Terms of Service` | EN | `common.terms_of_service` |
| 15 | jsx-text | `Last updated: October 2026` | ES? | `common.last_updated_october_2026_3` |
| 19 | jsx-text | `1. Acceptance of Terms` | EN | `common.1_acceptance_of_terms` |
| 20 | jsx-text | `By using Glimmind ("the App"), you agree to these Terms. If you disagree, do not use the App.` | EN | `common.by_using_glimmind_the_app_you_agree_to_the` |
| 24 | jsx-text | `2. Description of Service` | EN | `common.2_description_of_service` |
| 25 | jsx-text | `Glimmind is a flashcard application with a visible 4-cycle progression for language learning. Features include:` | EN? | `common.glimmind_is_a_flashcard_application_with_a` |
| 27 | jsx-text | `4-cycle progression (New → Seen → Recognized → Frequent → Learned)` | EN? | `common.4_cycle_progression_new_seen_recognized_fr` |
| 28 | jsx-text | `Exam mode (typed answers with fuzzy validation) and Training mode (self-evaluation)` | EN? | `common.exam_mode_typed_answers_with_fuzzy_validat` |
| 29 | jsx-text | `Voice study mode (speech recognition + text-to-speech)` | ES? | `common.voice_study_mode_speech_recognition_text_t` |
| 30 | jsx-text | `Local-first storage with optional Firebase cloud sync` | EN? | `common.local_first_storage_with_optional_firebase` |
| 31 | jsx-text | `Import from CSV, text, YouTube subtitles` | EN? | `common.import_from_csv_text_youtube_subtitles` |
| 32 | jsx-text | `Cross-platform: Web (PWA), iOS, Android` | ES? | `common.cross_platform_web_pwa_ios_android` |
| 37 | jsx-text | `3. Accounts` | neutral? | `common.3_accounts` |
| 39 | jsx-text | `Authentication:` | neutral? | `common.authentication` |
| 39 | jsx-text | `Google OAuth or guest mode (local only)` | ES? | `common.google_oauth_or_guest_mode_local_only` |
| 40 | jsx-text | `Responsibility:` | neutral? | `common.responsibility` |
| 40 | jsx-text | `You are responsible for your account credentials and activity` | EN | `common.you_are_responsible_for_your_account_crede` |
| 41 | jsx-text | `Guest mode:` | ES? | `common.guest_mode` |
| 42 | jsx-text | `Deletion:` | neutral? | `common.deletion` |
| 42 | jsx-text | `You may delete your account anytime in Settings` | EN | `common.you_may_delete_your_account_anytime_in_set` |
| 47 | jsx-text | `4. Purchases & Billing` | ES? | `common.4_purchases_billing` |
| 49 | jsx-text | `Free tier:` | ES? | `common.free_tier` |
| 49 | jsx-text | `1,000 active cards, all core features` | EN | `common.1_000_active_cards_all_core_features` |
| 50 | jsx-text | `Premium (€4.99 one-time):` | ES? | `common.premium_4_99_one_time` |
| 50 | jsx-text | `5,000 cards, premium voices, priority sync, advanced stats` | EN? | `common.5_000_cards_premium_voices_priority_sync_a` |
| 51 | jsx-text | `Billing:` | neutral? | `common.billing` |
| 52 | jsx-text | `Refunds:` | neutral? | `common.refunds` |
| 53 | jsx-text | `Price changes:` | ES? | `common.price_changes` |
| 53 | jsx-text | `30 days notice before any price increase` | EN? | `common.30_days_notice_before_any_price_increase` |
| 58 | jsx-text | `5. Acceptable Use` | ES? | `common.5_acceptable_use` |
| 59 | jsx-text | `You agree not to:` | EN | `common.you_agree_not_to` |
| 61 | jsx-text | `Reverse engineer, decompile, or attempt to extract source code` | ES? | `common.reverse_engineer_decompile_or_attempt_to_e` |
| 62 | jsx-text | `Automate access (scraping, bots) beyond normal usage` | EN? | `common.automate_access_scraping_bots_beyond_norma` |
| 63 | jsx-text | `Upload illegal, harmful, or copyright-infringing content` | ES? | `common.upload_illegal_harmful_or_copyright_infrin` |
| 64 | jsx-text | `Abuse voice/translation APIs or exceed reasonable quotas` | ES? | `common.abuse_voice_translation_apis_or_exceed_rea` |
| 65 | jsx-text | `Attempt to bypass quota limits or security controls` | ES? | `common.attempt_to_bypass_quota_limits_or_security` |
| 70 | jsx-text | `6. Intellectual Property` | ES? | `common.6_intellectual_property` |
| 72 | jsx-text | `Your content:` | EN | `common.your_content` |
| 72 | jsx-text | `You retain full ownership of flashcards you create` | EN | `common.you_retain_full_ownership_of_flashcards_yo` |
| 73 | jsx-text | `Our IP:` | ES? | `common.our_ip` |
| 73 | jsx-text | `The App code, design, and branding are our property` | EN | `common.the_app_code_design_and_branding_are_our_p` |
| 74 | jsx-text | `License:` | neutral? | `common.license` |
| 74 | jsx-text | `You grant us a license to store/process your content to provide the service` | EN? | `common.you_grant_us_a_license_to_store_process_yo` |
| 79 | jsx-text | `7. Disclaimers` | neutral? | `common.7_disclaimers` |
| 81 | jsx-text | `The App is provided "as is" without warranties of any kind` | EN? | `common.the_app_is_provided_as_is_without_warranti` |
| 82 | jsx-text | `We do not guarantee uninterrupted, error-free, or secure operation` | EN? | `common.we_do_not_guarantee_uninterrupted_error_fr` |
| 83 | jsx-text | `The 4-cycle progression is an educational aid, not a guaranteed learning outcome` | EN? | `common.the_4_cycle_progression_is_an_educational_` |
| 84 | jsx-text | `Voice recognition accuracy varies by language, accent, and environment` | EN? | `common.voice_recognition_accuracy_varies_by_langu` |
| 89 | jsx-text | `8. Limitation of Liability` | EN | `common.8_limitation_of_liability` |
| 94 | jsx-text | `9. Termination` | neutral? | `common.9_termination` |
| 95 | jsx-text | `We may suspend or terminate access for violations of these Terms. You may terminate by deleting your account. Provisions that should survive termination (IP, disclaimers, liability limits) will survive.` | EN? | `common.we_may_suspend_or_terminate_access_for_vio` |
| 99 | jsx-text | `10. Governing Law` | ES? | `common.10_governing_law` |
| 100 | jsx-text | `These Terms are governed by the laws of Spain. Disputes resolved in courts of Madrid.` | EN | `common.these_terms_are_governed_by_the_laws_of_sp` |
| 104 | jsx-text | `11. Changes` | neutral? | `common.11_changes` |
| 105 | jsx-text | `We may modify these Terms. Material changes notified 30 days in advance via email or in-app.` | EN? | `common.we_may_modify_these_terms_material_changes` |
| 109 | jsx-text | `12. Contact` | EN | `common.12_contact` |
| 110 | jsx-text | `Questions? Email` | EN | `common.questions_email_3` |
| 110 | jsx-text | `legal@glimmind.com` | do-not-translate (email) | `common.legal_glimmind_com` |
| 115 | jsx-text | `← Back to Glimmind` | EN | `common.back_to_glimmind_3` |

**src/components/views/dashboard/BigListsGrid.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 23 | jsx-text | `Listas en digestión` | ES-neutral | `common.listas_en_digestion` |

**src/components/views/dashboard/BulkImportPanel.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 77 | jsx-text | `Pegar` | neutral? | `common.pegar` |
| 86 | jsx-text | `Subir archivo` | ES? | `common.subir_archivo` |
| 95 | jsx-text | `Vocabulario` | neutral? | `common.vocabulario` |
| 109 | placeholder | `Abandon,Abandonar,They had to abandon the project&#10;Absolutely,Absolutamente,This is crucial for scaling` | EN? | `common.abandon_abandonar_they_had_to_abandon_the_` |
| 130 | expr | `Leyendo archivo...` | ES? | `common.leyendo_archivo` |
| 130 | expr | `Elegir archivo CSV` | ES? | `common.elegir_archivo_csv` |
| 144 | jsx-text | `Quitar` | neutral? | `common.quitar` |
| 149 | jsx-text | `Formato .csv con columnas Value1, Value2, Contexto. El encabezado se detecta y se ignora automáticamente.` | ES-neutral | `common.formato_csv_con_columnas_value1_value2_con` |
| 158 | jsx-text | `Pega un texto largo (artículo, capítulo, transcripción, letra de canción) para extraer vocabulario y expresiones.` | ES-neutral | `common.pega_un_texto_largo_articulo_capitulo_tran` |
| 164 | placeholder | `Pega aquí un texto en español o inglés (mín. 50 caracteres, 3+ oraciones)...` | ES-neutral | `common.pega_aqui_un_texto_en_espanol_o_ingles_min` |
| 174 | jsx-text | `🔍 Analizar y Extraer Vocabulario` | ES? | `common.analizar_y_extraer_vocabulario` |
| 182 | jsx-text | `Analizando...` | ES? | `common.analizando` |
| 191 | jsx-text | `Re-analizar` | ES? | `common.re_analizar` |
| 201 | jsx-text | `Seleccionar todo` | ES? | `common.seleccionar_todo` |
| 208 | jsx-text | `Limpiar selección` | ES-neutral | `common.limpiar_seleccion` |
| 229 | expr | `EXPRESIÓN` | ES-neutral | `common.expresion` |
| 241 | jsx-text | `candidatos seleccionados` | ES? | `common.candidatos_seleccionados` |
| 263 | jsx-text | `📋 Pega tu texto para ver la vista previa` | ES? | `common.pega_tu_texto_para_ver_la_vista_previa` |
| 263 | expr | `<span class="flex items-center gap-1">📋 Pega tu texto para ver la vista previa</span>` | ES? | `common.span_class_flex_items_center_gap_1_pega_tu` |
| 264 | jsx-text | `📋 No se detectaron datos` | EN? | `common.no_se_detectaron_datos` |
| 288 | jsx-text | `🗑️ Limpiar` | neutral? | `common.limpiar` |

**src/components/views/dashboard/DashboardContinueBanner.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 17 | jsx-text | `Continuar última sesión` | ES-neutral | `common.continuar_ultima_sesion` |
| 23 | jsx-text | `Continuar` | ES? | `common.continuar` |

**src/components/views/dashboard/DashboardEmptyState.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | jsx-text | `No se encontraron resultados` | EN? | `common.no_se_encontraron_resultados` |
| 11 | jsx-text | `Prueba con términos diferentes.` | ES-neutral | `common.prueba_con_terminos_diferentes` |
| 15 | jsx-text | `Ver todas las listas` | ES? | `common.ver_todas_las_listas` |
| 24 | jsx-text | `No hay listas aún` | ES-neutral | `common.no_hay_listas_aun` |
| 25 | jsx-text | `Crea tu primera lista para empezar a estudiar.` | ES? | `common.crea_tu_primera_lista_para_empezar_a_estud` |

**src/components/views/dashboard/DashboardProgressHero.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | jsx-text | `Tu Progreso` | ES? | `common.tu_progreso` |
| 13 | jsx-text | `Total Palabras` | EN | `common.total_palabras` |
| 17 | jsx-text | `Aprendidas` | ES? | `common.aprendidas` |
| 21 | jsx-text | `Por Aprender` | ES? | `common.por_aprender` |
| 25 | jsx-text | `Completado` | neutral? | `common.completado` |

**src/components/views/dashboard/DashboardSearchBar.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 21 | placeholder | `Buscar listas por nombre o concepto...` | ES? | `common.buscar_listas_por_nombre_o_concepto` |

**src/components/views/dashboard/DashboardToolbar.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 23 | expr | `Calculando límites…` | ES-neutral | `common.calculando_limites` |
| 28 | jsx-text | `Tus Listas de Estudio` | ES? | `common.tus_listas_de_estudio` |
| 29 | jsx-text | `Memoriza asociaciones de palabras rápidamente.` | ES-neutral | `common.memoriza_asociaciones_de_palabras_rapidame` |
| 40 | jsx-text | `Calculando límites…` | ES-neutral | `common.calculando_limites` |
| 51 | jsx-text | `Desde YouTube` | ES? | `common.desde_youtube` |
| 61 | jsx-text | `Catálogo de Barajas` | ES-neutral | `common.catalogo_de_barajas` |
| 78 | jsx-text | `Nueva Lista` | ES? | `common.nueva_lista_2` |

**src/components/views/dashboard/ListCard.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 84 | jsx-text | `Study` | neutral? | `common.study` |
| 90 | jsx-text | `Edit` | EN | `common.edit` |

**src/components/views/dashboard/RecentListsStrip.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 14 | jsx-text | `Listas Recientes` | ES? | `common.listas_recientes` |

**src/constants/landingDemoDeck.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 3 | const-string | `Inglés Básico` | ES-neutral | `common.ingles_basico` |
| 6 | field | `cosita de niños` | ES-neutral | `common.cosita_de_ninos` |
| 7 | field | `fue mi culpa` | ES? | `common.fue_mi_culpa` |
| 8 | field | `terminemos por hoy` | ES? | `common.terminemos_por_hoy` |
| 9 | field | `medio enfermo` | ES? | `common.medio_enfermo` |
| 10 | field | `ir a dormir` | ES? | `common.ir_a_dormir` |
| 11 | field | `trato hecho` | ES? | `common.trato_hecho` |
| 12 | field | `no hay ni que pensarlo` | EN? | `common.no_hay_ni_que_pensarlo` |
| 13 | field | `anda al grano` | ES? | `common.anda_al_grano` |
| 14 | field | `cuánto tiempo sin verte` | ES-neutral | `common.cuanto_tiempo_sin_verte` |
| 15 | field | `ir por las ramas` | ES? | `common.ir_por_las_ramas` |
| 16 | field | `cuál es la trampa` | ES-neutral | `common.cual_es_la_trampa` |
| 17 | field | `mucha suerte` | ES? | `common.mucha_suerte` |

**src/constants/landingValidationExample.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 3 | const-string | `said it htat` | ES? | `common.said_it_htat` |

**src/constants/premium.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 14 | const-string | `Listo. Tu cuenta ya es Premium.` | ES? | `common.listo_tu_cuenta_ya_es_premium` |
| 15 | const-string | `Pago recibido. Estamos activando tu plan, actualizá en unos segundos.` | ES-neutral | `common.pago_recibido_estamos_activando_tu_plan_ac` |
| 16 | const-string | `Cancelaste el pago. Tu plan sigue siendo el gratuito.` | ES? | `common.cancelaste_el_pago_tu_plan_sigue_siendo_el` |
| 17 | const-string | `No pudimos abrir el pago. Intentá de nuevo.` | ES-neutral | `common.no_pudimos_abrir_el_pago_intenta_de_nuevo` |
| 18 | const-string | `Tu cuenta ya es Premium.` | ES? | `common.tu_cuenta_ya_es_premium` |
| 19 | const-string | `Inicia sesión con Google para cambiar tu plan.` | ES-neutral | `common.inicia_sesion_con_google_para_cambiar_tu_p` |
| 21 | const-string | `La grabación de audio es una función Premium. Actualizá tu plan para activarla.` | ES-neutral | `common.la_grabacion_de_audio_es_una_funcion_premi` |

**src/context/VoskModelContext.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 44 | field | `Unknown error loading the Vosk model` | EN | `common.unknown_error_loading_the_vosk_model` |

**src/effects/types.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 37 | field | `Un cohete viaja hacia la meta con estela de partículas` | ES-neutral | `common.un_cohete_viaja_hacia_la_meta_con_estela_d` |
| 45 | field | `Combinación especial para items APRENDIDAS` | ES-neutral | `common.combinacion_especial_para_items_aprendidas` |
| 53 | field | `Partículas de colores emergen y vuelan al objetivo` | ES-neutral | `common.particulas_de_colores_emergen_y_vuelan_al_` |
| 61 | field | `El número crece, rebota y cambia brevemente de color` | ES-neutral | `common.el_numero_crece_rebota_y_cambia_brevemente` |
| 69 | field | `Un checkmark aparece con efecto de brillo` | ES? | `common.un_checkmark_aparece_con_efecto_de_brillo` |
| 77 | field | `Onda expansiva suave desde el centro` | ES? | `common.onda_expansiva_suave_desde_el_centro` |
| 85 | field | `Efecto combinado para rachas de aciertos` | ES? | `common.efecto_combinado_para_rachas_de_aciertos` |
| 93 | field | `Efecto visual para respuestas incorrectas` | ES? | `common.efecto_visual_para_respuestas_incorrectas` |
| 101 | field | `Sacudida breve del elemento para indicar error` | EN? | `common.sacudida_breve_del_elemento_para_indicar_e` |

**src/hooks/dashboard/useAssociationManipulation.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 34 | toast | `Llegaste a tu límite de {{…}} tarjetas. Elimina o archiva tarjetas para añadir más.` | ES-neutral | `common.llegaste_a_tu_limite_de_tarjetas_elimina_o` |

**src/hooks/dashboard/useDeckImporter.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 126 | field | `Error al extraer keywords` | EN? | `common.error_al_extraer_keywords` |
| 198 | field | `No se pudo leer el archivo.` | EN? | `common.no_se_pudo_leer_el_archivo` |

**src/hooks/dashboard/useListEditorTranslation.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 42 | toast | `Debes iniciar sesión para traducir.` | ES-neutral | `common.debes_iniciar_sesion_para_traducir` |
| 78 | toast | `Se agotó la cuota de traducción.` | ES-neutral | `common.se_agoto_la_cuota_de_traduccion` |
| 82 | toast | `Traducidas {{…}} tarjetas. Quedan {{…}} caracteres.` | ES? | `common.traducidas_tarjetas_quedan_caracteres` |
| 89 | field | `Error al traducir.` | EN | `common.error_al_traducir` |

**src/hooks/game/useGameViewGameplay.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 160 | field | `🎉 ¡Aprendida!` | ES-neutral | `common.aprendida` |

**src/hooks/voice/stt/useChipTTSTT.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 228 | field | `STT error.` | EN | `common.stt_error` |
| 318 | field | `Microphone access denied.` | EN | `common.microphone_access_denied` |

**src/hooks/voice/stt/useVoskModelContext.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 32 | field | `Failed to preload Vosk model.` | EN? | `common.failed_to_preload_vosk_model` |

**src/hooks/voice/stt/useVoskWordMatch.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 187 | field | `Error al iniciar Vosk` | EN? | `common.error_al_iniciar_vosk` |

**src/hooks/voice/tts/useChirpVoices.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 30 | field | `Error al cargar las voces` | EN? | `common.error_al_cargar_las_voces` |

**src/services/grouping/embeddingWorker.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 117 | field | `Embedding failed` | EN | `common.embedding_failed` |

**src/services/quotaService.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 106 | const-string | `No pudimos verificar tu plan. Revisa tu conexión e inténtalo de nuevo.` | ES-neutral | `common.no_pudimos_verificar_tu_plan_revisa_tu_con` |

**src/services/voice/stt/evaluateAnswer.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 13 | const-string | `No te escuché bien. Probá pronunciar más claro o escribí la respuesta.` | AR (voseo) | `common.no_te_escuche_bien_proba_pronunciar_mas_cl` |

**src/store/gameStore.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 393 | field | `Unknown error` | EN | `common.unknown_error` |

**src/utils/importPreview.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 12 | label | `Value1` | neutral? | `common.value1_2` |
| 13 | label | `Value2` | neutral? | `common.value2` |
| 14 | label | `Contexto` | neutral? | `common.contexto_2` |
| 33 | label | `1 → Value1:` | neutral? | `common.1_value1` |
| 34 | label | `2 → Value2:` | neutral? | `common.2_value2` |
| 35 | label | `3 → Contexto:` | neutral? | `common.3_contexto` |
| 67 | title | `${escaped` | neutral? | `common.escaped` |

**src/utils/progress.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 196 | field | `¡Meta completada! {{…}} repasos` | ES-neutral | `common.meta_completada_repasos` |
| 197 | field | `Arranca una nueva meta igual.` | ES? | `common.arranca_una_nueva_meta_igual` |
| 212 | field | `¡{{…}}% dominado en esta lista!` | ES-neutral | `common.dominado_en_esta_lista` |
| 213 | field | `{{…}} de {{…}} palabras dominadas.` | ES? | `common.de_palabras_dominadas` |

### nav (36)

**src/components/Navbar.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 20 | label | `Dashboard` | EN | `nav.dashboard` |
| 25 | label | `History` | EN | `nav.history` |
| 30 | label | `Reports` | EN | `nav.reports` |
| 35 | label | `Settings` | EN | `nav.settings` |
| 74 | jsx-text | `Glimmind` | neutral? | `nav.glimmind` |

**src/components/layout/AppHeader.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 34 | jsx-text | `Glimmind` | neutral? | `nav.glimmind_2` |
| 40 | aria-label | `Add value` | ES? | `nav.add_value` |
| 46 | jsx-text | `Add` | neutral? | `nav.add` |
| 67 | jsx-text | `Activity` | neutral? | `nav.activity` |
| 74 | jsx-text | `Reports` | EN | `nav.reports_2` |
| 82 | jsx-text | `Admin` | neutral? | `nav.admin` |
| 88 | aria-label | `Settings` | EN | `nav.settings_2` |

**src/components/layout/CelebrationOverlay.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 30 | aria-label | `Cerrar` | ES? | `nav.cerrar` |

**src/components/layout/CountdownTimer.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 54 | expr | `Auto advance in {{…}} seconds` | EN? | `nav.auto_advance_in_seconds` |

**src/components/layout/ErrorBoundary.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 45 | jsx-text | `Algo salió mal` | ES-neutral | `nav.algo_salio_mal` |
| 46 | jsx-text | `Ocurrió un error inesperado. Puedes intentar de nuevo o recargar la página.` | ES-neutral | `nav.ocurrio_un_error_inesperado_puedes_intenta` |
| 51 | jsx-text | `Ver detalles del error` | EN? | `nav.ver_detalles_del_error` |
| 63 | jsx-text | `Reintentar` | neutral? | `nav.reintentar` |
| 69 | jsx-text | `Recargar página` | ES-neutral | `nav.recargar_pagina` |

**src/components/layout/GoalWidget.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 48 | jsx-text | `repasos` | neutral? | `nav.repasos` |
| 51 | jsx-text | `Meta diaria` | ES? | `nav.meta_diaria` |
| 57 | expr | `día` | ES-neutral | `nav.dia` |
| 57 | expr | `días` | ES-neutral | `nav.dias` |
| 64 | jsx-text | `Hoy por estado` | ES? | `nav.hoy_por_estado` |
| 77 | jsx-text | `Cambiar meta` | ES? | `nav.cambiar_meta` |

**src/components/layout/GuestBanner.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 29 | jsx-text | `Modo invitado: tus datos son temporales, solo en este navegador. Al registrarte no se pasan a tu cuenta.` | EN? | `nav.modo_invitado_tus_datos_son_temporales_sol` |
| 36 | aria-label | `Cerrar aviso` | ES? | `nav.cerrar_aviso` |

**src/components/layout/QuotaAlert.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 46 | jsx-text | `Calculando límites…` | ES-neutral | `nav.calculando_limites` |
| 59 | jsx-text | `No se pudieron cargar tus límites` | ES-neutral | `nav.no_se_pudieron_cargar_tus_limites` |
| 60 | jsx-text | `No pudimos verificar tu tier: podrías ver límites que no te corresponden.` | ES-neutral | `nav.no_pudimos_verificar_tu_tier_podrias_ver_l` |
| 69 | jsx-text | `Reintentar` | neutral? | `nav.reintentar_2` |
| 91 | expr | `Eliminá o archivá tarjetas para poder crear nuevas listas.` | AR (voseo) | `nav.elimina_o_archiva_tarjetas_para_poder_crea` |

**src/components/layout/SyncChip.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 41 | jsx-text | `Reintentar` | neutral? | `nav.reintentar_3` |

**src/components/layout/UserMenu.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 40 | aria-label | `User menu` | ES? | `nav.user_menu` |
| 71 | jsx-text | `Settings` | EN | `nav.settings_3` |
| 85 | jsx-text | `Sign out` | EN | `nav.sign_out` |

### auth (33)

**src/components/Auth.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 22 | toast | `Firebase is not configured correctly.` | EN? | `auth.firebase_is_not_configured_correctly` |
| 83 | jsx-text | `Glimmind` | neutral? | `auth.glimmind` |
| 84 | jsx-text | `Recuerda lo que aprendes, no solo lo practicas.` | EN? | `auth.recuerda_lo_que_aprendes_no_solo_lo_practi` |
| 88 | jsx-text | `Empezar` | ES? | `auth.empezar` |
| 89 | jsx-text | `Elige cómo quieres entrar` | ES-neutral | `auth.elige_como_quieres_entrar` |
| 103 | jsx-text | `Conectando...` | ES? | `auth.conectando` |
| 113 | jsx-text | `Continuar con Google` | ES? | `auth.continuar_con_google` |
| 127 | jsx-text | `Continuar como invitado` | ES? | `auth.continuar_como_invitado` |
| 134 | jsx-text | `Modo invitado:` | ES? | `auth.modo_invitado` |
| 137 | jsx-text | `Con Google:` | ES? | `auth.con_google` |
| 137 | jsx-text | `tus mazos quedan guardados en tu cuenta.` | ES? | `auth.tus_mazos_quedan_guardados_en_tu_cuenta` |
| 143 | jsx-text | `Términos` | ES-neutral | `auth.terminos` |
| 144 | jsx-text | `Política de Privacidad` | ES-neutral | `auth.politica_de_privacidad` |
| 152 | jsx-text | `Volver al inicio` | ES? | `auth.volver_al_inicio` |

**src/context/AuthContext.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 99 | auth-error | `Login failed. Please try again.` | EN | `auth.login_failed_please_try_again` |
| 103 | auth-error | `No account found with this email.` | EN | `auth.no_account_found_with_this_email` |
| 107 | auth-error | `Invalid email or password.` | EN | `auth.invalid_email_or_password` |
| 110 | auth-error | `Invalid email address.` | EN | `auth.invalid_email_address` |
| 113 | auth-error | `This account has been disabled.` | EN | `auth.this_account_has_been_disabled` |
| 116 | auth-error | `Too many failed attempts. Please try again later.` | EN | `auth.too_many_failed_attempts_please_try_again_` |
| 119 | auth-error | `Network error. Please check your connection.` | EN | `auth.network_error_please_check_your_connection` |
| 156 | auth-error | `useAuth must be used within an AuthProvider` | EN? | `auth.useauth_must_be_used_within_an_authprovide` |

**src/pages/Login.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 33 | toast | `Welcome back!` | EN | `auth.welcome_back` |
| 57 | jsx-text | `Welcome back` | EN | `auth.welcome_back` |
| 58 | jsx-text | `Sign in to continue to Glimmind` | EN | `auth.sign_in_to_continue_to_glimmind` |
| 63 | jsx-text | `Email` | EN | `auth.email` |
| 74 | placeholder | `you@example.com` | do-not-translate (email) | `auth.you_example_com` |
| 80 | jsx-text | `Password` | EN | `auth.password` |
| 92 | placeholder | `••••••••` | symbol (do-not-translate) | `auth.x` |
| 100 | expr | `Hide password` | EN | `auth.hide_password` |
| 100 | expr | `Show password` | EN | `auth.show_password` |
| 128 | jsx-text | `Signing in...` | EN | `auth.signing_in` |
| 137 | jsx-text | `Sign up` | EN | `auth.sign_up` |

### errors (53)

**src/errors/guestErrors.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 1 | const-string | `La generación con IA requiere una cuenta. Crea tu usuario gratis para crear barajas desde YouTube o texto.` | ES-neutral | `errors.la_generacion_con_ia_requiere_una_cuenta_c` |

**src/hooks/app/useAppHandlers.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 83 | toast | `Datos sincronizados desde la nube` | ES? | `errors.datos_sincronizados_desde_la_nube` |
| 91 | field | `Error al sincronizar` | EN | `errors.error_al_sincronizar` |
| 166 | toast | `Llegaste a tu límite de {{…}} tarjetas. Elimina o archiva tarjetas para añadir más.` | ES-neutral | `errors.llegaste_a_tu_limite_de_tarjetas_elimina_o` |
| 174 | toast | `Te quedan solo {{…}} tarjetas disponibles` | ES? | `errors.te_quedan_solo_tarjetas_disponibles` |
| 179 | toast | `Estás acercándote al límite de tarjetas ({{…}}/{{…}})` | ES-neutral | `errors.estas_acercandote_al_limite_de_tarjetas` |
| 197 | toast | `Agregado a "{{…}}"` | ES? | `errors.agregado_a` |
| 216 | toast | `Llegaste a tu límite de {{…}} mazos. Elimina o archiva mazos para crear más.` | ES-neutral | `errors.llegaste_a_tu_limite_de_mazos_elimina_o_ar` |
| 233 | toast | `Debes iniciar sesión para crear listas` | ES-neutral | `errors.debes_iniciar_sesion_para_crear_listas` |
| 276 | toast | `Mazo creado` | ES? | `errors.mazo_creado` |
| 285 | field | `Error al crear el mazo` | EN? | `errors.error_al_crear_el_mazo` |
| 309 | toast | `Debes iniciar sesión para crear listas` | ES-neutral | `errors.debes_iniciar_sesion_para_crear_listas` |
| 395 | field | `Error al importar los mazos` | EN? | `errors.error_al_importar_los_mazos` |
| 424 | toast | `Lista guardada` | ES? | `errors.lista_guardada` |
| 444 | toast | `Lista guardada` | ES? | `errors.lista_guardada` |
| 497 | toast | `No se puede eliminar una lista sin guardar` | EN? | `errors.no_se_puede_eliminar_una_lista_sin_guardar` |
| 504 | toast | `Mazo eliminado (modo invitado)` | ES? | `errors.mazo_eliminado_modo_invitado` |
| 510 | toast | `Mazo eliminado` | ES? | `errors.mazo_eliminado` |
| 513 | field | `Error al eliminar` | EN | `errors.error_al_eliminar` |
| 516 | toast | `Mazo eliminado (solo local)` | ES? | `errors.mazo_eliminado_solo_local` |
| 554 | toast | `Mazos divididos correctamente` | ES? | `errors.mazos_divididos_correctamente` |
| 562 | field | `Error al dividir mazos` | EN? | `errors.error_al_dividir_mazos` |

**src/hooks/dashboard/useListEditorActions.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 136 | toast | `Llegaste a tu límite de {{…}} tarjetas. Elimina o archiva tarjetas para añadir más.` | ES-neutral | `errors.llegaste_a_tu_limite_de_tarjetas_elimina_o_2` |
| 152 | toast | `No se guardó: el mazo quedaría sin tarjetas. Si quieres eliminarlo, bórralo desde el panel.` | ES-neutral | `errors.no_se_guardo_el_mazo_quedaria_sin_tarjetas` |
| 167 | toast | `Llegaste a tu límite de {{…}} tarjetas. Elimina o archiva tarjetas para añadir más.` | ES-neutral | `errors.llegaste_a_tu_limite_de_tarjetas_elimina_o_2` |
| 174 | toast | `Te quedan solo {{…}} tarjetas disponibles` | ES? | `errors.te_quedan_solo_tarjetas_disponibles_2` |
| 196 | toast | `⚠️ Ponle un nombre a tu mazo antes de guardar.` | ES? | `errors.ponle_un_nombre_a_tu_mazo_antes_de_guardar` |
| 206 | toast | `Lista guardada` | ES? | `errors.lista_guardada_2` |
| 233 | toast | `Llegaste a tu límite de {{…}} tarjetas. Elimina o archiva tarjetas para añadir más.` | ES-neutral | `errors.llegaste_a_tu_limite_de_tarjetas_elimina_o_2` |
| 324 | toast | `Debes iniciar sesión para traducir.` | ES-neutral | `errors.debes_iniciar_sesion_para_traducir` |
| 360 | toast | `Se agotó la cuota de traducción.` | ES-neutral | `errors.se_agoto_la_cuota_de_traduccion` |
| 364 | toast | `Traducidas {{…}} tarjetas. Quedan {{…}} caracteres.` | ES? | `errors.traducidas_tarjetas_quedan_caracteres` |
| 371 | field | `Error al traducir.` | EN | `errors.error_al_traducir` |
| 395 | toast | `Exportadas {{…}} tarjetas` | ES? | `errors.exportadas_tarjetas` |
| 434 | toast | `⚠️ Ponle un nombre a tu mazo antes de importar.` | ES? | `errors.ponle_un_nombre_a_tu_mazo_antes_de_importa` |
| 451 | toast | `Llegaste a tu límite de {{…}} tarjetas. Elimina o archiva tarjetas para añadir más.` | ES-neutral | `errors.llegaste_a_tu_limite_de_tarjetas_elimina_o_2` |
| 535 | toast | `⚠️ No hay tarjetas para importar.` | EN? | `errors.no_hay_tarjetas_para_importar` |
| 556 | toast | `⚠️ No se puede importar en este modo.` | EN? | `errors.no_se_puede_importar_en_este_modo` |
| 590 | toast | `✅ {{…}} tarjetas importadas{{…}}` | ES? | `errors.tarjetas_importadas` |
| 597 | toast | `⚠️ No se puede dividir en múltiples mazos.` | ES-neutral | `errors.no_se_puede_dividir_en_multiples_mazos` |
| 614 | toast | `✅ {{…}} tarjetas importadas en {{…}} mazos{{…}}` | ES? | `errors.tarjetas_importadas_en_mazos` |

**src/utils/authErrors.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 37 | field | `El navegador bloqueó la ventana de acceso. Se intentó redirigir automáticamente.` | ES-neutral | `errors.el_navegador_bloqueo_la_ventana_de_acceso_` |
| 38 | field | `Se canceló una ventana de acceso anterior. Intenta de nuevo.` | ES-neutral | `errors.se_cancelo_una_ventana_de_acceso_anterior_` |
| 39 | field | `Cerraste la ventana de acceso.` | ES? | `errors.cerraste_la_ventana_de_acceso` |
| 40 | field | `Este navegador bloquea el almacenamiento local requerido para iniciar sesión.` | ES-neutral | `errors.este_navegador_bloquea_el_almacenamiento_l` |
| 41 | field | `Error de red. Revisá tu conexión.` | AR (voseo) | `errors.error_de_red_revisa_tu_conexion` |
| 42 | field | `Demasiados intentos fallidos. Esperá un momento e intentá de nuevo.` | ES-neutral | `errors.demasiados_intentos_fallidos_espera_un_mom` |
| 43 | field | `Dominio no autorizado para iniciar sesión.` | ES-neutral | `errors.dominio_no_autorizado_para_iniciar_sesion` |
| 44 | field | `El proveedor de acceso no está habilitado en el proyecto.` | ES-neutral | `errors.el_proveedor_de_acceso_no_esta_habilitado_` |
| 45 | field | `Ya existe una cuenta con ese correo usando otro método.` | ES-neutral | `errors.ya_existe_una_cuenta_con_ese_correo_usando` |
| 46 | field | `Esta cuenta está deshabilitada.` | ES-neutral | `errors.esta_cuenta_esta_deshabilitada` |
| 53 | field | `Login no disponible en este navegador (aislamiento de origen). Probá con otro navegador o ventana privada.` | AR (voseo) | `errors.login_no_disponible_en_este_navegador_aisl` |
| 64 | field | `No pudimos iniciar sesión. Intentá de nuevo.` | ES-neutral | `errors.no_pudimos_iniciar_sesion_intenta_de_nuevo` |

### dashboard (26)

**src/components/cards/BigListCard.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 43 | title | `${segment.label` | ES? | `dashboard.segment_label` |
| 58 | jsx-text | `Hitos` | ES? | `dashboard.hitos` |
| 62 | jsx-text | `¡Lista dominada al 100%!` | ES-neutral | `dashboard.lista_dominada_al_100` |
| 94 | jsx-text | `Study` | neutral? | `dashboard.study` |
| 97 | jsx-text | `Edit` | EN | `dashboard.edit` |

**src/components/views/Dashboard.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 113 | expr | `Llegaste a tu límite de {{…}} tarjetas` | ES-neutral | `dashboard.llegaste_a_tu_limite_de_tarjetas` |
| 128 | jsx-text | `Cargando mazos…` | ES? | `dashboard.cargando_mazos` |
| 138 | jsx-text | `No se pudieron actualizar tus mazos` | EN? | `dashboard.no_se_pudieron_actualizar_tus_mazos` |
| 140 | expr | `Revisa tu conexión e inténtalo de nuevo.` | ES-neutral | `dashboard.revisa_tu_conexion_e_intentalo_de_nuevo` |
| 146 | jsx-text | `Reintentar` | neutral? | `dashboard.reintentar` |
| 173 | jsx-text | `← Volver al Dashboard` | EN | `dashboard.volver_al_dashboard` |

**src/components/views/HistoryView.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 119 | aria-label | `Volver` | ES? | `dashboard.volver` |
| 127 | jsx-text | `Actividad` | ES? | `dashboard.actividad` |
| 128 | jsx-text | `Historial de eventos de tus tarjetas.` | ES? | `dashboard.historial_de_eventos_de_tus_tarjetas` |
| 134 | jsx-text | `Historial desactivado` | ES? | `dashboard.historial_desactivado` |
| 135 | jsx-text | `Activa el registro de historial en Configuración para empezar a registrar la actividad de tus tarjetas.` | ES-neutral | `dashboard.activa_el_registro_de_historial_en_configu` |
| 139 | jsx-text | `Ir a Configuración` | ES-neutral | `dashboard.ir_a_configuracion` |
| 150 | aria-label | `Filtrar por tipo` | ES? | `dashboard.filtrar_por_tipo` |
| 152 | jsx-text | `Todos los tipos` | ES? | `dashboard.todos_los_tipos` |
| 161 | aria-label | `Filtrar por lista` | ES? | `dashboard.filtrar_por_lista` |
| 163 | jsx-text | `Todas las listas` | ES? | `dashboard.todas_las_listas` |
| 172 | placeholder | `Buscar tarjeta...` | ES? | `dashboard.buscar_tarjeta` |
| 174 | aria-label | `Buscar tarjeta` | ES? | `dashboard.buscar_tarjeta` |
| 180 | jsx-text | `Sin actividad` | ES? | `dashboard.sin_actividad` |
| 181 | jsx-text | `Aún no hay eventos registrados para estos filtros.` | ES-neutral | `dashboard.aun_no_hay_eventos_registrados_para_estos_` |
| 213 | expr | `Cargar más` | ES-neutral | `dashboard.cargar_mas` |

### editor (87)

**src/components/list-editor/AssociationTable.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 91 | aria-label | `Remove tag ${tag` | ES? | `editor.remove_tag_tag` |
| 103 | placeholder | `Add tag + Enter...` | ES? | `editor.add_tag_enter` |
| 141 | aria-label | `Card detail` | EN | `editor.card_detail` |
| 144 | jsx-text | `Detalle de tarjeta` | ES? | `editor.detalle_de_tarjeta` |
| 148 | aria-label | `Close detail` | EN | `editor.close_detail` |
| 159 | expr | `Value 1` | neutral? | `editor.value_1` |
| 174 | expr | `Value 2` | neutral? | `editor.value_2` |
| 186 | jsx-text | `Contexto` | neutral? | `editor.contexto` |
| 194 | placeholder | `Add context...` | ES? | `editor.add_context` |
| 200 | jsx-text | `Tags` | neutral? | `editor.tags` |
| 230 | jsx-text | `Guardar y cerrar` | ES? | `editor.guardar_y_cerrar` |
| 353 | expr | `Value 1` | neutral? | `editor.value_1` |
| 362 | expr | `Value 2` | neutral? | `editor.value_2` |
| 366 | expr | `Acción` | ES-neutral | `editor.accion` |
| 393 | expr | `Collapse detail` | EN | `editor.collapse_detail` |
| 393 | expr | `Expand detail` | EN | `editor.expand_detail` |
| 408 | placeholder | `Enter term...` | ES? | `editor.enter_term` |
| 419 | placeholder | `Enter definition...` | ES? | `editor.enter_definition` |
| 431 | placeholder | `Contexto...` | neutral? | `editor.contexto` |
| 436 | jsx-text | `Restaurar` | neutral? | `editor.restaurar` |
| 440 | aria-label | `Delete row` | EN | `editor.delete_row` |
| 452 | expr | `No hay resultados en tarjetas archivadas.` | EN? | `editor.no_hay_resultados_en_tarjetas_archivadas` |
| 452 | expr | `Add a card to get started.` | EN? | `editor.add_a_card_to_get_started` |

**src/components/list-editor/BulkImport.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | jsx-text | `void \| Promise` | ES? | `editor.void_promise` |
| 69 | field | `No se pudo leer el archivo.` | EN? | `editor.no_se_pudo_leer_el_archivo` |
| 122 | jsx-text | `🗑️ Limpiar selección` | ES-neutral | `editor.limpiar_seleccion` |
| 129 | expr | `🔗 Frase` | neutral? | `editor.frase` |
| 129 | expr | `🔤 Palabra` | neutral? | `editor.palabra` |
| 164 | jsx-text | `Pegá un artículo, párrafo o notas sueltas. Se extraerán palabras y frases clave automáticamente.` | ES-neutral | `editor.pega_un_articulo_parrafo_o_notas_sueltas_s` |
| 170 | placeholder | `The quick brown fox jumps over the lazy dog. Machine learning enables computers to learn from data. Neural networks process information through interconnected nodes.` | EN? | `editor.the_quick_brown_fox_jumps_over_the_lazy_do` |
| 177 | jsx-text | `⚠️ Límite: 10,000` | ES-neutral | `editor.limite_10_000` |
| 179 | jsx-text | `(mín. 3)` | ES-neutral | `editor.min_3` |
| 188 | expr | `🔍 Analizando...` | ES? | `editor.analizando` |
| 188 | expr | `🔍 Analizar y Extraer Vocabulario` | ES? | `editor.analizar_y_extraer_vocabulario` |
| 207 | expr | `Validando... [{{…}}%]` | ES? | `editor.validando` |
| 217 | label | `Pegar texto` | ES? | `editor.pegar_texto` |
| 218 | label | `Subir archivo` | ES? | `editor.subir_archivo` |
| 219 | label | `🔍 Extraer Keywords` | ES? | `editor.extraer_keywords` |
| 239 | jsx-text | `Formato: Value1, Value2, Contexto. Primera columna → término, segunda → definición, tercera → contexto. El encabezado se detecta y se ignora automáticamente.` | ES-neutral | `editor.formato_value1_value2_contexto_primera_col` |
| 246 | placeholder | `Abandon,Abandonar,They had to abandon the project&#10;Absolutely,Absolutamente,This is crucial for scaling` | EN? | `editor.abandon_abandonar_they_had_to_abandon_the_` |
| 257 | expr | `No se detectaron datos válidos` | ES-neutral | `editor.no_se_detectaron_datos_validos` |
| 257 | expr | `Pega tu texto para ver la vista previa` | ES? | `editor.pega_tu_texto_para_ver_la_vista_previa` |
| 280 | jsx-text | `🗑️ Limpiar` | neutral? | `editor.limpiar` |
| 291 | expr | `Validando... [{{…}}%]` | ES? | `editor.validando` |
| 291 | expr | `Process Import` | EN | `editor.process_import` |
| 310 | expr | `Leyendo archivo...` | ES? | `editor.leyendo_archivo` |
| 310 | expr | `Elegir archivo CSV` | ES? | `editor.elegir_archivo_csv` |
| 312 | jsx-text | `Formato .csv con columnas Value1, Value2, Contexto. El encabezado se detecta y se ignora automáticamente.` | ES-neutral | `editor.formato_csv_con_columnas_value1_value2_con` |

**src/components/list-editor/DictionaryShortcuts.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | label | `Cambridge` | neutral? | `editor.cambridge` |
| 11 | label | `WordReference` | neutral? | `editor.wordreference` |
| 12 | label | `Urban Dictionary` | ES? | `editor.urban_dictionary` |
| 13 | label | `YouGlish` | neutral? | `editor.youglish` |
| 42 | jsx-text | `🛡️ Revalidar significado (confianza)` | ES? | `editor.revalidar_significado_confianza` |
| 45 | jsx-text | `Consulta estas fuentes para verificar o ajustar el valor.` | ES? | `editor.consulta_estas_fuentes_para_verificar_o_aj` |

**src/components/list-editor/ListEditorBulkImport.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 7 | jsx-text | `void \| Promise` | ES? | `editor.void_promise_2` |

**src/components/list-editor/ListEditorFooter.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 29 | toast | `⚠️ Ponle un nombre a tu mazo antes de guardar.` | ES? | `editor.ponle_un_nombre_a_tu_mazo_antes_de_guardar` |
| 60 | expr | `💾 Guardar mazo` | ES? | `editor.guardar_mazo` |

**src/components/list-editor/ListEditorNameSection.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 20 | jsx-text | `📚 EDITANDO MAZO` | ES? | `editor.editando_mazo` |
| 38 | placeholder | `Escribe un nombre para tu mazo...` | ES? | `editor.escribe_un_nombre_para_tu_mazo` |
| 51 | expr | `⚠️ Ponle un nombre a tu mazo para poder guardarlo` | ES? | `editor.ponle_un_nombre_a_tu_mazo_para_poder_guard` |

**src/components/list-editor/ListEditorToolbar.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 54 | placeholder | `Buscar tarjeta...` | ES? | `editor.buscar_tarjeta` |
| 68 | jsx-text | `🇪🇸 ES` | neutral? | `editor.es` |
| 69 | jsx-text | `🇫🇷 FR` | neutral? | `editor.fr` |
| 70 | jsx-text | `🇩🇪 DE` | ES? | `editor.de` |
| 71 | jsx-text | `🇧🇷 PT` | neutral? | `editor.pt` |
| 83 | jsx-text | `Eliminar` | ES? | `editor.eliminar` |
| 89 | jsx-text | `Exportar` | neutral? | `editor.exportar` |
| 105 | jsx-text | `Añadiendo...` | ES-neutral | `editor.anadiendo` |
| 116 | jsx-text | `📥 Importar` | neutral? | `editor.importar` |

**src/components/list-editor/ValidationScreen.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 61 | toast | `⚠️ Selecciona al menos una categoría para importar.` | ES-neutral | `editor.selecciona_al_menos_una_categoria_para_imp` |
| 74 | jsx-text | `📚 Validar importación` | ES-neutral | `editor.validar_importacion` |
| 85 | jsx-text | `📊 Análisis de contenido` | ES-neutral | `editor.analisis_de_contenido` |
| 98 | jsx-text | `De las` | ES? | `editor.de_las` |
| 99 | jsx-text | `tarjetas importadas:` | ES? | `editor.tarjetas_importadas` |
| 99 | jsx-text | `existentes,` | neutral? | `editor.existentes` |
| 99 | jsx-text | `similares,` | neutral? | `editor.similares` |
| 99 | jsx-text | `nuevas.` | neutral? | `editor.nuevas` |
| 106 | jsx-text | `📋 Distribución en decks` | ES-neutral | `editor.distribucion_en_decks` |
| 109 | jsx-text | `Límite:` | ES-neutral | `editor.limite` |
| 110 | jsx-text | `tarjetas por deck` | EN | `editor.tarjetas_por_deck` |
| 128 | aria-label | `Deck ${deck.name` | EN | `editor.deck_deck_name` |
| 143 | aria-label | `Seleccionar categorías a importar` | ES-neutral | `editor.seleccionar_categorias_a_importar` |
| 220 | jsx-text | `Importando...` | ES? | `editor.importando` |
| 225 | jsx-text | `📤 Agregar tarjetas` | ES? | `editor.agregar_tarjetas` |
| 228 | expr | `Se importarán {{…}} de {{…}}` | ES-neutral | `editor.se_importaran_de` |
| 238 | jsx-text | `← Volver al editor` | ES? | `editor.volver_al_editor` |
| 284 | aria-label | `Tarjetas ${label.toLowerCase()` | ES? | `editor.tarjetas_label_tolowercase` |

### store (126)

**src/components/modals/CreateYouTubeDeckModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 12 | label | `Express` | neutral? | `store.express` |
| 12 | field | `Rápido` | ES-neutral | `store.rapido` |
| 13 | label | `Standard` | neutral? | `store.standard` |
| 13 | field | `Recomendado` | neutral? | `store.recomendado` |
| 14 | label | `Extended` | neutral? | `store.extended` |
| 14 | field | `Profundo` | neutral? | `store.profundo` |
| 15 | label | `Massive` | neutral? | `store.massive` |
| 15 | field | `Completo` | neutral? | `store.completo` |
| 36 | label | `Español` | ES-neutral | `store.espanol` |
| 37 | label | `Alemán` | ES-neutral | `store.aleman` |
| 38 | label | `Francés` | ES-neutral | `store.frances` |
| 39 | label | `Italiano` | neutral? | `store.italiano` |
| 40 | label | `Portugués` | ES-neutral | `store.portugues` |
| 41 | label | `Inglés` | ES-neutral | `store.ingles` |
| 45 | label | `B1 Intermedio` | ES? | `store.b1_intermedio` |
| 45 | field | `Vocabulario cotidiano y frases útiles` | ES-neutral | `store.vocabulario_cotidiano_y_frases_utiles` |
| 46 | label | `B2-C1 Avanzado` | ES? | `store.b2_c1_avanzado` |
| 46 | field | `Phrasal verbs, idioms y coloquialismos` | ES? | `store.phrasal_verbs_idioms_y_coloquialismos` |
| 131 | expr | `Llegaste al límite de tarjetas ({{…}}/{{…}}). Liberá espacio para usar IA.` | ES-neutral | `store.llegaste_al_limite_de_tarjetas_libera_espa` |
| 163 | expr | `No se pudieron obtener los subtítulos. Usa la opción manual.` | ES-neutral | `store.no_se_pudieron_obtener_los_subtitulos_usa_` |
| 166 | field | `Error al procesar el video` | EN? | `store.error_al_procesar_el_video` |
| 201 | field | `Error al generar la baraja desde la transcripción` | ES-neutral | `store.error_al_generar_la_baraja_desde_la_transc` |
| 213 | jsx-text | `Crear baraja desde YouTube` | ES? | `store.crear_baraja_desde_youtube` |
| 214 | aria-label | `Cerrar` | ES? | `store.cerrar` |
| 223 | jsx-text | `URL del video` | ES? | `store.url_del_video` |
| 228 | placeholder | `https://www.youtube.com/watch?v=...` | ES? | `store.https_www_youtube_com_watch_v` |
| 252 | jsx-text | `Transcripción del video` | ES-neutral | `store.transcripcion_del_video` |
| 257 | placeholder | `Pega aquí la transcripción completa del video...` | ES-neutral | `store.pega_aqui_la_transcripcion_completa_del_vi` |
| 267 | expr | `Generando baraja...` | ES? | `store.generando_baraja` |
| 267 | expr | `Generar Baraja desde Transcripción` | ES-neutral | `store.generar_baraja_desde_transcripcion` |
| 273 | jsx-text | `Idioma de traducción` | ES-neutral | `store.idioma_de_traduccion` |
| 289 | jsx-text | `Mazo recomendado:` | ES? | `store.mazo_recomendado` |
| 300 | jsx-text | `⚙️ Opciones avanzadas` | ES? | `store.opciones_avanzadas` |
| 314 | jsx-text | `Tamaño de la baraja` | ES-neutral | `store.tamano_de_la_baraja` |
| 332 | jsx-text | `términos` | ES-neutral | `store.terminos` |
| 345 | jsx-text | `Perfil de foco` | ES? | `store.perfil_de_foco` |
| 394 | jsx-text | `Procesa automáticamente hasta los primeros 60 minutos del vídeo.` | ES-neutral | `store.procesa_automaticamente_hasta_los_primeros` |
| 401 | jsx-text | `Cancelar` | ES? | `store.cancelar` |
| 409 | expr | `Analizar vídeo` | ES-neutral | `store.analizar_video` |

**src/components/views/dashboard/CreateListForm.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 118 | jsx-text | `Nombre de la Lista` | ES? | `store.nombre_de_la_lista` |
| 123 | placeholder | `ej: Verbos Irregulares` | ES? | `store.ej_verbos_irregulares` |
| 132 | jsx-text | `Concepto (Par)` | ES? | `store.concepto_par` |
| 137 | placeholder | `ej: Inglés / Español` | ES-neutral | `store.ej_ingles_espanol` |
| 158 | expr | `− Quitar datos masivos` | ES? | `store.quitar_datos_masivos` |
| 158 | expr | `+ Pegar lista CSV / Excel ahora` | ES? | `store.pegar_lista_csv_excel_ahora` |
| 193 | jsx-text | `Cancelar` | ES? | `store.cancelar_2` |
| 199 | jsx-text | `Crear y Empezar` | ES? | `store.crear_y_empezar` |

**src/constants/prebuiltDecks.ts**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 9 | field | `Dominá las expresiones del día a día que no encontrás en los libros de texto.` | AR (voseo) | `store.domina_las_expresiones_del_dia_a_dia_que_n` |
| 14 | field | `¿Qué tal?` | ES-neutral | `store.que_tal` |
| 15 | field | `Estoy de acuerdo / Me copa` | ES? | `store.estoy_de_acuerdo_me_copa` |
| 16 | field | `No hay que pensarlo` | EN? | `store.no_hay_que_pensarlo` |
| 17 | field | `¡Está genial!` | ES-neutral | `store.esta_genial` |
| 18 | field | `Fue mi culpa` | ES? | `store.fue_mi_culpa` |
| 19 | field | `Esperá un momento` | ES-neutral | `store.espera_un_momento` |
| 20 | field | `Estoy sin plata` | ES? | `store.estoy_sin_plata` |
| 21 | field | `Cosita de niños / Muy fácil` | ES-neutral | `store.cosita_de_ninos_muy_facil` |
| 22 | field | `Terminemos por hoy` | ES? | `store.terminemos_por_hoy` |
| 23 | field | `Ir por las ramas` | ES? | `store.ir_por_las_ramas` |
| 24 | field | `Estoy jodiendo / Es broma` | ES? | `store.estoy_jodiendo_es_broma` |
| 25 | field | `¡Cuánto tiempo sin verte!` | ES-neutral | `store.cuanto_tiempo_sin_verte` |
| 26 | field | `¿Cuá son las trampas?` | ES-neutral | `store.cua_son_las_trampas` |
| 27 | field | `Estar medio enfermo` | ES? | `store.estar_medio_enfermo` |
| 28 | field | `Ir a dormir` | ES? | `store.ir_a_dormir` |
| 29 | field | `Ya estoy encargado` | ES? | `store.ya_estoy_encargado` |
| 30 | field | `Andá al grano` | ES-neutral | `store.anda_al_grano` |
| 31 | field | `¡Mucha suerte!` | ES-neutral | `store.mucha_suerte` |
| 32 | field | `Trato hecho` | ES? | `store.trato_hecho` |
| 33 | field | `Relajate` | neutral? | `store.relajate` |
| 41 | field | `Preparate para comprar, preguntar precios y devolver productos.` | ES? | `store.preparate_para_comprar_preguntar_precios_y` |
| 46 | field | `¿Cuánto cuesta esto?` | ES-neutral | `store.cuanto_cuesta_esto` |
| 47 | field | `¿Tiene esto en azul?` | ES-neutral | `store.tiene_esto_en_azul` |
| 48 | field | `Solo estoy mirando` | ES? | `store.solo_estoy_mirando` |
| 49 | field | `¿Puedo probarmelo?` | ES-neutral | `store.puedo_probarmelo` |
| 50 | field | `¿Dónde está el probador?` | ES-neutral | `store.donde_esta_el_probador` |
| 51 | field | `Me lo llevo` | ES? | `store.me_lo_llevo` |
| 52 | field | `¿Aceptan tarjeta de crédito?` | ES-neutral | `store.aceptan_tarjeta_de_credito` |
| 53 | field | `¿Me da la factura?` | ES-neutral | `store.me_da_la_factura` |
| 54 | field | `¿Hay descuento?` | ES-neutral | `store.hay_descuento` |
| 55 | field | `Es muy caro` | ES? | `store.es_muy_caro` |
| 56 | field | `¿Puedo devolver esto?` | ES-neutral | `store.puedo_devolver_esto` |
| 57 | field | `¿Tiene talle más grande?` | ES-neutral | `store.tiene_talle_mas_grande` |
| 58 | field | `¿Dónde se paga?` | ES-neutral | `store.donde_se_paga` |
| 59 | field | `Necesito un recibo para regalo` | ES? | `store.necesito_un_recibo_para_regalo` |
| 60 | field | `¿Qué está en oferta?` | ES-neutral | `store.que_esta_en_oferta` |
| 61 | field | `¿Me da una bolsa?` | ES-neutral | `store.me_da_una_bolsa` |
| 62 | field | `Este, por favor` | ES? | `store.este_por_favor` |
| 63 | field | `¿Tienen programa de fidelidad?` | ES-neutral | `store.tienen_programa_de_fidelidad` |
| 64 | field | `Cambié de opinión` | ES-neutral | `store.cambie_de_opinion` |
| 65 | field | `Gracias por su ayuda` | ES? | `store.gracias_por_su_ayuda` |
| 73 | field | `Aprendé frases icónicas de la serie más popular para practicar conversación.` | AR (voseo) | `store.aprende_frases_iconicas_de_la_serie_mas_po` |
| 78 | field | `¿Cómo estás?` | ES-neutral | `store.como_estas` |
| 79 | field | `¡Estábamos en un break!` | ES-neutral | `store.estabamos_en_un_break` |
| 80 | field | `¡Girá!` | ES-neutral | `store.gira` |
| 81 | field | `¡Oh mi Dios!` | ES-neutral | `store.oh_mi_dios` |
| 82 | field | `¡Estábamos separados!` | ES-neutral | `store.estabamos_separados` |
| 83 | field | `Es un punto vacuno (no importa)` | EN? | `store.es_un_punto_vacuno_no_importa` |
| 84 | field | `Él es su langosta (alma gemela)` | ES-neutral | `store.el_es_su_langosta_alma_gemela` |
| 85 | field | `¿Podría ser más...?` | ES-neutral | `store.podria_ser_mas` |
| 86 | field | `Estado de alerta total` | EN? | `store.estado_de_alerta_total` |
| 87 | field | `El capítulo en el que...` | ES-neutral | `store.el_capitulo_en_el_que` |
| 88 | field | `Gato apestoso, gato apestoso` | ES? | `store.gato_apestoso_gato_apestoso` |
| 89 | field | `Bienvenido al mundo real` | ES? | `store.bienvenido_al_mundo_real` |
| 90 | field | `No soy bueno dando consejos` | EN? | `store.no_soy_bueno_dando_consejos` |
| 91 | field | `Toda la vida todos me dijeron` | ES? | `store.toda_la_vida_todos_me_dijeron` |
| 92 | field | `¿Ya superaste?` | ES-neutral | `store.ya_superaste` |
| 93 | field | `¿Cuándo estuviste conmigo?` | ES-neutral | `store.cuando_estuviste_conmigo` |
| 94 | field | `¡Siete! ¡Siete! ¡Siete!` | ES-neutral | `store.siete_siete_siete` |
| 95 | field | `¡Lo sé!` | ES-neutral | `store.lo_se` |
| 96 | field | `¡Estamos en un break!` | ES-neutral | `store.estamos_en_un_break` |
| 97 | field | `Agarrá una cuchara (entrá en la onda)` | ES-neutral | `store.agarra_una_cuchara_entra_en_la_onda` |
| 105 | field | `Memorizá la letra de Thriller y aprendé vocabulario a través de la música.` | ES-neutral | `store.memoriza_la_letra_de_thriller_y_aprende_vo` |
| 110 | field | `Está cerca de la medianoche` | ES-neutral | `store.esta_cerca_de_la_medianoche` |
| 111 | field | `Algo malvado acecha desde la oscuridad` | ES? | `store.algo_malvado_acecha_desde_la_oscuridad` |
| 112 | field | `Bajo la luz de la luna` | ES? | `store.bajo_la_luz_de_la_luna` |
| 113 | field | `Intentás gritar` | ES-neutral | `store.intentas_gritar` |
| 114 | field | `Pero el terror te quita el sonido antes de que puedas` | ES? | `store.pero_el_terror_te_quita_el_sonido_antes_de` |
| 115 | field | `Empezás a congelarte` | ES-neutral | `store.empezas_a_congelarte` |
| 116 | field | `Mientras el terror te mira justo a los ojos` | ES? | `store.mientras_el_terror_te_mira_justo_a_los_ojo` |
| 117 | field | `Salen a por ti` | ES? | `store.salen_a_por_ti` |
| 118 | field | `Cerrando tu mente` | ES? | `store.cerrando_tu_mente` |
| 119 | field | `Pero nadie te salva de la bestia a punto de atacar` | ES? | `store.pero_nadie_te_salva_de_la_bestia_a_punto_d` |
| 120 | field | `Sabés que es noche de thriller` | AR (voseo) | `store.sabes_que_es_noche_de_thriller` |
| 121 | field | `Y nadie va a salvarte` | ES? | `store.y_nadie_va_a_salvarte` |
| 122 | field | `De la bestia a punto de atacar` | ES? | `store.de_la_bestia_a_punto_de_atacar` |
| 123 | field | `Estás peleando por tu vida` | ES-neutral | `store.estas_peleando_por_tu_vida` |
| 124 | field | `Dentro de un asesino, thriller esta noche` | ES? | `store.dentro_de_un_asesino_thriller_esta_noche` |

### onboarding (73)

**src/components/onboarding/CustomCreationSection.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | jsx-text | `🛠️ ¿Preferís cargar tu propio material?` | AR (voseo) | `onboarding.preferis_cargar_tu_propio_material` |
| 11 | jsx-text | `Creá tu propia lista con el método que prefieras.` | AR (voseo) | `onboarding.crea_tu_propia_lista_con_el_metodo_que_pre` |
| 16 | jsx-text | `CSV / Copiar y Pegar` | ES? | `onboarding.csv_copiar_y_pegar` |
| 17 | jsx-text | `Pegá desde Excel o Google Sheets` | ES-neutral | `onboarding.pega_desde_excel_o_google_sheets` |
| 20 | jsx-text | `Popular` | neutral? | `onboarding.popular` |
| 24 | jsx-text | `Generar con IA` | ES? | `onboarding.generar_con_ia` |
| 25 | jsx-text | `Creá listas por temas automáticamente` | AR (voseo) | `onboarding.crea_listas_por_temas_automaticamente` |
| 29 | jsx-text | `Carga Manual` | ES? | `onboarding.carga_manual` |
| 30 | jsx-text | `Formulario directo término por término` | ES-neutral | `onboarding.formulario_directo_termino_por_termino` |
| 37 | jsx-text | `Desde YouTube` | ES? | `onboarding.desde_youtube` |
| 38 | jsx-text | `Pegá una URL y generamos vocabulario automáticamente` | ES-neutral | `onboarding.pega_una_url_y_generamos_vocabulario_autom` |
| 42 | jsx-text | `Texto Libre` | ES? | `onboarding.texto_libre` |
| 43 | jsx-text | `Pegá un artículo, transcripción o texto y generamos vocabulario automáticamente` | ES-neutral | `onboarding.pega_un_articulo_transcripcion_o_texto_y_g` |
| 51 | jsx-text | `+ Crear Lista Personalizada` | ES? | `onboarding.crear_lista_personalizada` |

**src/components/onboarding/DeckAnalysisStats.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 6 | label | `✅ Existentes` | neutral? | `onboarding.existentes` |
| 13 | label | `⚠️ Similares` | neutral? | `onboarding.similares` |
| 20 | label | `✨ Nuevas` | neutral? | `onboarding.nuevas` |
| 30 | label | `Total` | EN | `onboarding.total` |
| 38 | jsx-text | `📊 Análisis de contenido` | ES-neutral | `onboarding.analisis_de_contenido` |

**src/components/onboarding/DeckCard.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 25 | jsx-text | `👁️ Previsualizar` | neutral? | `onboarding.previsualizar` |
| 31 | jsx-text | `🛒 Agregar a mi Espacio` | ES? | `onboarding.agregar_a_mi_espacio` |

**src/components/onboarding/DeckCategorySelector.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 16 | label | `Existentes` | neutral? | `onboarding.existentes_2` |
| 24 | label | `Similares` | neutral? | `onboarding.similares_2` |
| 32 | label | `Nuevas` | neutral? | `onboarding.nuevas_2` |
| 60 | aria-label | `Seleccionar categorías a importar` | ES-neutral | `onboarding.seleccionar_categorias_a_importar` |
| 137 | expr | `Ver ejemplos` | ES? | `onboarding.ver_ejemplos` |

**src/components/onboarding/DeckDistributionList.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 57 | jsx-text | `📋 Distribución en decks` | ES-neutral | `onboarding.distribucion_en_decks` |
| 60 | jsx-text | `Límite:` | ES-neutral | `onboarding.limite` |
| 61 | jsx-text | `tarjetas por deck` | EN | `onboarding.tarjetas_por_deck` |
| 165 | expr | `Ocultar decks ▲` | EN | `onboarding.ocultar_decks` |
| 165 | expr | `Ver todos ({{…}}) ▼` | ES? | `onboarding.ver_todos` |

**src/components/onboarding/DeckPreviewModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 58 | jsx-text | `Cancelar` | ES? | `onboarding.cancelar` |
| 64 | jsx-text | `🛒 Agregar a mi Espacio` | ES? | `onboarding.agregar_a_mi_espacio_2` |

**src/components/onboarding/DeckStoreOnboarding.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 54 | field | `Error al cargar el catálogo` | ES-neutral | `onboarding.error_al_cargar_el_catalogo` |
| 69 | field | `Error al cargar el catálogo` | ES-neutral | `onboarding.error_al_cargar_el_catalogo` |
| 102 | toast | `¡Se agregaron {{…}} tarjetas a tu espacio!` | ES-neutral | `onboarding.se_agregaron_tarjetas_a_tu_espacio` |
| 104 | field | `Error al agregar tarjetas` | EN? | `onboarding.error_al_agregar_tarjetas` |
| 118 | jsx-text | `¡Bienvenido a tu Tienda de Barajas!` | ES-neutral | `onboarding.bienvenido_a_tu_tienda_de_barajas` |
| 119 | jsx-text | `No pudimos cargar el catálogo de decks preconstruidos.` | ES-neutral | `onboarding.no_pudimos_cargar_el_catalogo_de_decks_pre` |
| 126 | jsx-text | `Reintentar` | neutral? | `onboarding.reintentar` |
| 132 | jsx-text | `Crear lista personalizada` | ES? | `onboarding.crear_lista_personalizada_2` |
| 146 | jsx-text | `Analizando tarjetas...` | ES? | `onboarding.analizando_tarjetas` |
| 155 | jsx-text | `¡Bienvenido a tu Tienda de Barajas!` | ES-neutral | `onboarding.bienvenido_a_tu_tienda_de_barajas` |
| 156 | jsx-text | `Explorá nuestro catálogo, revisá las tarjetas y cargalas a tu espacio en 1 clic.` | AR (voseo) | `onboarding.explora_nuestro_catalogo_revisa_las_tarjet` |
| 166 | jsx-text | `Explorar Catálogo` | ES-neutral | `onboarding.explorar_catalogo` |

**src/components/onboarding/DeckValidationScreen.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 60 | jsx-text | `📚 Validar importación` | ES-neutral | `onboarding.validar_importacion` |
| 73 | jsx-text | `✨ ¡Todas las tarjetas son nuevas para ti!` | ES-neutral | `onboarding.todas_las_tarjetas_son_nuevas_para_ti` |
| 87 | jsx-text | `De las` | ES? | `onboarding.de_las` |
| 88 | jsx-text | `tarjetas:` | ES? | `onboarding.tarjetas` |
| 88 | jsx-text | `existentes,` | neutral? | `onboarding.existentes_3` |
| 88 | jsx-text | `similares,` | neutral? | `onboarding.similares_3` |
| 88 | jsx-text | `nuevas.` | neutral? | `onboarding.nuevas_3` |
| 117 | jsx-text | `Importando...` | ES? | `onboarding.importando` |
| 121 | jsx-text | `📤 Agregar tarjetas` | ES? | `onboarding.agregar_tarjetas` |
| 139 | jsx-text | `← Volver al Catálogo` | ES-neutral | `onboarding.volver_al_catalogo` |

**src/components/onboarding/ImportValidationModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 21 | label | `Existentes` | neutral? | `onboarding.existentes_4` |
| 21 | field | `— ya están en tu espacio` | ES-neutral | `onboarding.ya_estan_en_tu_espacio` |
| 22 | label | `Similares` | neutral? | `onboarding.similares_4` |
| 22 | field | `— pueden crear duplicados` | ES? | `onboarding.pueden_crear_duplicados` |
| 23 | label | `Nuevas` | neutral? | `onboarding.nuevas_4` |
| 23 | field | `— completamente nuevas` | ES? | `onboarding.completamente_nuevas` |
| 72 | expr | `✨ ¡Todas las tarjetas son nuevas para ti!` | ES-neutral | `onboarding.todas_las_tarjetas_son_nuevas_para_ti_2` |
| 73 | expr | `De las {{…}} tarjetas importadas: {{…}} existentes, {{…}} similares, {{…}} nuevas.` | ES? | `onboarding.de_las_tarjetas_importadas_existentes_simi` |
| 110 | jsx-text | `Validar importación` | ES-neutral | `onboarding.validar_importacion_2` |
| 118 | aria-label | `Cerrar` | ES? | `onboarding.cerrar` |
| 139 | jsx-text | `Análisis de contenido` | ES-neutral | `onboarding.analisis_de_contenido_2` |
| 169 | jsx-text | `Ejemplos similares:` | ES? | `onboarding.ejemplos_similares` |
| 186 | jsx-text | `Ocultar ejemplos ▲` | ES? | `onboarding.ocultar_ejemplos` |
| 193 | jsx-text | `Mostrar ejemplos ▼` | ES? | `onboarding.mostrar_ejemplos` |
| 209 | jsx-text | `¿Qué deseas agregar a tu espacio?` | ES-neutral | `onboarding.que_deseas_agregar_a_tu_espacio` |
| 266 | jsx-text | `📝 Nombre del mazo X` | ES? | `onboarding.nombre_del_mazo_x` |
| 276 | placeholder | `Ej: Mi vocabulario de viajes` | ES? | `onboarding.ej_mi_vocabulario_de_viajes` |
| 322 | expr | `({{…}} decks)` | EN | `onboarding.decks` |

### settings (45)

**src/components/modals/SettingsModal.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 76 | field | `Settings modal opened` | EN | `settings.settings_modal_opened` |
| 115 | field | `Settings flow finished successfully` | EN? | `settings.settings_flow_finished_successfully` |
| 126 | field | `Flow failed: {{…}}` | EN | `settings.flow_failed` |
| 131 | field | `Settings flow finished successfully (local-only due to backend error)` | EN? | `settings.settings_flow_finished_successfully_local_` |
| 140 | field | `User closed modal without saving` | ES? | `settings.user_closed_modal_without_saving` |
| 150 | field | `speechSynthesis not available in this mobile engine` | EN | `settings.speechsynthesis_not_available_in_this_mobi` |
| 157 | expr | `Hola, soy Glimmind` | ES? | `settings.hola_soy_glimmind` |
| 159 | expr | `Hello, I am Glimmind` | ES? | `settings.hello_i_am_glimmind` |
| 179 | field | `TTS error` | EN | `settings.tts_error` |
| 200 | expr | `Término` | ES-neutral | `settings.termino` |
| 201 | expr | `Definición` | ES-neutral | `settings.definicion` |
| 209 | jsx-text | `Settings` | EN | `settings.settings` |
| 310 | expr | `Accept & Close` | EN | `settings.accept_close` |
| 317 | jsx-text | `Cancel` | EN | `settings.cancel` |

**src/components/views/SettingsView.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 175 | aria-label | `Volver` | ES? | `settings.volver` |
| 183 | jsx-text | `Configuración` | ES-neutral | `settings.configuracion` |
| 184 | jsx-text | `Preferencias generales de tu entorno.` | ES? | `settings.preferencias_generales_de_tu_entorno` |
| 192 | jsx-text | `Premium` | ES? | `settings.premium` |
| 193 | jsx-text | `Desbloquear 5000 tarjetas activas, voces HD y sincronización prioritaria.` | ES-neutral | `settings.desbloquear_5000_tarjetas_activas_voces_hd` |
| 198 | jsx-text | `Plan Premium` | ES? | `settings.plan_premium` |
| 202 | jsx-text | `Plan gratuito` | ES? | `settings.plan_gratuito` |
| 221 | expr | `Iniciá sesión para actualizar` | AR (voseo) | `settings.inicia_sesion_para_actualizar` |
| 221 | expr | `Actualizar a Premium` | ES? | `settings.actualizar_a_premium` |
| 227 | jsx-text | `Pago único. Tu plan Premium no se renueva ni cobra de nuevo.` | ES-neutral | `settings.pago_unico_tu_plan_premium_no_se_renueva_n` |
| 237 | jsx-text | `Registro de historial` | ES? | `settings.registro_de_historial` |
| 238 | jsx-text | `Registra la actividad de tus tarjetas: movimientos entre listas, ediciones de valor1/valor2 y el avance en los niveles del juego (nueva, vista, reconocida, conocida, aprendida).` | ES? | `settings.registra_la_actividad_de_tus_tarjetas_movi` |
| 246 | jsx-text | `Activo. A partir de ahora se registra la actividad de tus tarjetas y las vistas de Actividad, Resumen de juegos y Ranking estarán disponibles.` | ES-neutral | `settings.activo_a_partir_de_ahora_se_registra_la_ac` |
| 251 | jsx-text | `Activo. Se registra la actividad de tus tarjetas y la vista de Actividad estará disponible.` | ES-neutral | `settings.activo_se_registra_la_actividad_de_tus_tar` |
| 258 | jsx-text | `Desactivado por defecto. Tus tarjetas no registran actividad ni contadores de partidas.` | EN? | `settings.desactivado_por_defecto_tus_tarjetas_no_re` |
| 267 | aria-label | `Registro de historial` | ES? | `settings.registro_de_historial` |
| 285 | jsx-text | `Grabación de audio` | ES-neutral | `settings.grabacion_de_audio` |
| 286 | jsx-text | `Guarda los audios de tus intentos en modo voz, separados por acierto y error. Temporal: los archivos se eliminan automáticamente.` | ES-neutral | `settings.guarda_los_audios_de_tus_intentos_en_modo_` |
| 291 | jsx-text | `Función Premium. Actualizá tu plan para guardar tus audios en la nube.` | ES-neutral | `settings.funcion_premium_actualiza_tu_plan_para_gua` |
| 295 | jsx-text | `Activo. Las grabaciones se suben a la nube y se eliminan de forma automática.` | ES-neutral | `settings.activo_las_grabaciones_se_suben_a_la_nube_` |
| 299 | jsx-text | `Desactivado por defecto. No se guardan audios.` | EN? | `settings.desactivado_por_defecto_no_se_guardan_audi` |
| 307 | aria-label | `Grabación de audio` | ES-neutral | `settings.grabacion_de_audio` |
| 326 | jsx-text | `Fallback de reconocimiento de voz` | ES? | `settings.fallback_de_reconocimiento_de_voz` |
| 327 | jsx-text | `Si el reconocimiento del navegador falla hasta 3 veces seguidas, se activa automáticamente un reconocimiento externo para intentar leer tu respuesta.` | ES-neutral | `settings.si_el_reconocimiento_del_navegador_falla_h` |
| 332 | jsx-text | `Activo. Tenés hasta 3 intentos antes de que se intente el reconocimiento externo.` | AR (voseo) | `settings.activo_tenes_hasta_3_intentos_antes_de_que` |
| 336 | jsx-text | `Desactivado por defecto. Si falla el reconocimiento del navegador, la respuesta se considera incorrecta sin intentos adicionales.` | ES? | `settings.desactivado_por_defecto_si_falla_el_recono` |
| 345 | aria-label | `Fallback de reconocimiento de voz` | ES? | `settings.fallback_de_reconocimiento_de_voz` |
| 362 | jsx-text | `Máximo de tarjetas por mazo` | ES-neutral | `settings.maximo_de_tarjetas_por_mazo` |
| 363 | jsx-text | `Al importar texto, CSV o YouTube, si superás este límite se dividirá automáticamente en varios mazos.` | ES-neutral | `settings.al_importar_texto_csv_o_youtube_si_superas` |
| 383 | jsx-text | `Valor actual:` | ES? | `settings.valor_actual` |
| 384 | jsx-text | `tarjetas por mazo` | ES? | `settings.tarjetas_por_mazo` |

### game (79)

**src/components/game/AttemptList.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 44 | jsx-text | `Esperado:` | neutral? | `game.esperado` |

**src/components/game/CardBadges.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 13 | jsx-text | `Fallback` | neutral? | `game.fallback` |

**src/components/game/CardContent.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 72 | aria-label | `Tu respuesta` | ES? | `game.tu_respuesta` |

**src/components/game/CardFeedback.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 29 | jsx-text | `Tu respuesta` | ES? | `game.tu_respuesta_2` |
| 38 | expr | `✓ Correcto` | ES? | `game.correcto` |
| 38 | expr | `✗ Incorrecto` | ES? | `game.incorrecto` |

**src/components/game/CardToolbar.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 26 | aria-label | `Edit card` | EN | `game.edit_card` |
| 38 | aria-label | `Escuchar respuesta` | ES? | `game.escuchar_respuesta` |

**src/components/game/CardVoiceIndicator.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 32 | jsx-text | `Hablando…` | ES? | `game.hablando` |
| 46 | jsx-text | `Evaluando…` | ES? | `game.evaluando` |
| 55 | expr | `✓ Correcto` | ES? | `game.correcto_2` |
| 55 | expr | `✗ Incorrecto` | ES? | `game.incorrecto_2` |

**src/components/game/CommandToast.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 16 | label | `Revelar` | neutral? | `game.revelar` |
| 21 | label | `Siguiente` | ES? | `game.siguiente` |
| 26 | label | `Continuar` | ES? | `game.continuar` |
| 31 | label | `Detener` | neutral? | `game.detener` |
| 38 | label | `Comando` | ES? | `game.comando` |
| 68 | jsx-text | `Comando:` | ES? | `game.comando` |

**src/components/game/CycleMiniBar.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 29 | jsx-text | `pend.` | neutral? | `game.pend` |

**src/components/game/CycleProgress.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 108 | jsx-text | `Progreso total` | EN | `game.progreso_total` |
| 122 | jsx-text | `APRENDIDAS` | ES? | `game.aprendidas` |
| 191 | jsx-text | `aprendidas` | ES? | `game.aprendidas` |
| 212 | jsx-text | `Progreso por ciclo` | ES? | `game.progreso_por_ciclo` |
| 220 | jsx-text | `de 4` | ES? | `game.de_4` |
| 261 | jsx-text | `APRENDIDAS` | ES? | `game.aprendidas` |
| 276 | expr | `Ocultar detalles ▲` | ES? | `game.ocultar_detalles` |
| 276 | expr | `Toca para ver detalles ▼` | ES? | `game.toca_para_ver_detalles` |

**src/components/game/FinishedScreen.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 59 | label | `✅ APRENDIDAS` | ES? | `game.aprendidas_2` |
| 78 | jsx-text | `¡Sesión Completada!` | ES-neutral | `game.sesion_completada` |
| 79 | jsx-text | `Este es tu progreso en esta sesión` | ES-neutral | `game.este_es_tu_progreso_en_esta_sesion` |
| 102 | jsx-text | `🏆 ¡Has aprendido` | ES-neutral | `game.has_aprendido` |
| 103 | jsx-text | `items en esta sesión!` | ES-neutral | `game.items_en_esta_sesion` |
| 110 | jsx-text | `No se marcaron items como aprendidos en esta sesión.` | ES-neutral | `game.no_se_marcaron_items_como_aprendidos_en_es` |
| 123 | jsx-text | `¿Qué quieres hacer con los items aprendidos?` | ES-neutral | `game.que_quieres_hacer_con_los_items_aprendidos` |
| 124 | jsx-text | `Los` | ES? | `game.los` |
| 125 | jsx-text | `items en "Aprendidas" ya no necesitan aparecer. Puedes archivarlos para mantener tu lista limpia.` | EN? | `game.items_en_aprendidas_ya_no_necesitan_aparec` |
| 134 | jsx-text | `Archivar items aprendidos y reiniciar` | ES? | `game.archivar_items_aprendidos_y_reiniciar` |
| 137 | jsx-text | `⚠️ Los items archivados se guardarán y` | ES-neutral | `game.los_items_archivados_se_guardaran_y` |
| 138 | jsx-text | `no volverán a aparecer` | ES-neutral | `game.no_volveran_a_aparecer` |
| 138 | jsx-text | `en futuras sesiones.` | ES? | `game.en_futuras_sesiones` |
| 148 | jsx-text | `Reiniciar sin archivar` | ES? | `game.reiniciar_sin_archivar` |
| 157 | jsx-text | `Regresar al panel` | ES? | `game.regresar_al_panel` |

**src/components/game/GameControls.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 47 | aria-label | `Atrás` | ES-neutral | `game.atras` |
| 48 | title | `Atrás` | ES-neutral | `game.atras` |
| 49 | jsx-text | `Atrás` | ES-neutral | `game.atras` |
| 58 | jsx-text | `Siguiente` | ES? | `game.siguiente_2` |
| 68 | jsx-text | `Validar` | neutral? | `game.validar` |
| 87 | jsx-text | `Revelar` | neutral? | `game.revelar_2` |
| 98 | jsx-text | `Correcta` | neutral? | `game.correcta` |

**src/components/game/PracticeModeControls.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 53 | aria-label | `Tarjeta anterior` | ES? | `game.tarjeta_anterior` |
| 54 | title | `Tarjeta anterior` | ES? | `game.tarjeta_anterior` |
| 68 | aria-label | `Detener presentación` | ES-neutral | `game.detener_presentacion` |
| 69 | title | `Detener presentación` | ES-neutral | `game.detener_presentacion` |

**src/components/game/SessionBar.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 31 | expr | `Modo Práctica` | ES-neutral | `game.modo_practica` |
| 31 | expr | `Modo Real` | ES? | `game.modo_real` |
| 42 | expr | `Desactivar voz` | ES? | `game.desactivar_voz` |
| 42 | expr | `Activar voz` | ES? | `game.activar_voz` |
| 51 | expr | `Voz ON` | ES? | `game.voz_on` |
| 51 | expr | `Voz OFF` | ES? | `game.voz_off` |
| 62 | expr | `Detener AutoPlay` | ES? | `game.detener_autoplay` |
| 62 | expr | `Iniciar AutoPlay` | ES? | `game.iniciar_autoplay` |
| 63 | expr | `Detener AutoPlay` | ES? | `game.detener_autoplay` |
| 63 | expr | `Iniciar AutoPlay` | ES? | `game.iniciar_autoplay` |
| 78 | aria-label | `Restart list` | EN | `game.restart_list` |
| 84 | aria-label | `Ajustes de partida` | ES? | `game.ajustes_de_partida` |

**src/components/game/VoiceControls.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 36 | aria-label | `Apagar modo voz` | ES? | `game.apagar_modo_voz` |
| 77 | aria-label | `Repetir palabra` | ES? | `game.repetir_palabra` |

**src/components/views/GameView.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 274 | jsx-text | `Loading...` | EN | `game.loading` |

**src/components/views/game/CardStage.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 88 | jsx-text | `Pending:` | neutral? | `game.pending` |
| 94 | jsx-text | `Correct:` | neutral? | `game.correct` |
| 166 | jsx-text | `) : showVoiceControls ? (` | neutral? | `game.showvoicecontrols` |

**src/components/views/game/EditDeckButton.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 10 | aria-label | `Edit deck` | EN | `game.edit_deck` |
| 11 | title | `Edit deck` | EN | `game.edit_deck` |

**src/components/views/game/GameHeaderMobileToggle.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 46 | expr | `Disable voice` | ES? | `game.disable_voice` |
| 46 | expr | `Enable voice` | ES? | `game.enable_voice` |
| 63 | expr | `Voice ON` | ES? | `game.voice_on` |

**src/components/views/game/RecordingWarningBanner.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 18 | jsx-text | `Grabación temporal activa: los audios se suben a la nube y se eliminan automáticamente.` | ES-neutral | `game.grabacion_temporal_activa_los_audios_se_su` |

**src/components/views/game/RevealWarning.tsx**

| Line | Cat | Text (verbatim) | Origin | Proposed key |
|---|---|---|---|---|
| 20 | jsx-text | `Try` | EN | `game.try` |
| 26 | jsx-text | `Reveal` | neutral? | `game.reveal` |

---

## Dynamic call sites (no inline literal — resolve at source during P3)

- `src/App.tsx:195` — toast(var): `ids.length`
- `src/components/Auth.tsx:35` — toast(var): `describeAuthError`
- `src/components/Auth.tsx:52` — toast(var): `describeAuthError`
- `src/components/Auth.tsx:58` — toast(var): `describeAuthError`
- `src/components/game/CycleProgress.tsx:198` — aria-label(dynamic): `aria-label={isExpanded ? 'Colapsar' : 'Expandir'}`
- `src/components/game/PracticeModeControls.tsx:90` — aria-label(dynamic): `aria-label={canPause ? 'Pausar' : canPlay ? 'Reproducir' : 'Reproducir'}`
- `src/components/game/SessionBar.tsx:42` — aria-label(dynamic): `aria-label={voiceEnabled ? 'Desactivar voz' : 'Activar voz'}`
- `src/components/game/SessionBar.tsx:62` — aria-label(dynamic): `aria-label={isPresentationActive ? 'Detener AutoPlay' : 'Iniciar AutoPlay'}`
- `src/components/game/VoiceControls.tsx:54` — aria-label(dynamic): `aria-label={isVoiceActive ? 'Pausar' : 'Iniciar'}`
- `src/components/layout/CountdownTimer.tsx:54` — aria-label(dynamic): `aria-label={ariaLabel ?? `Auto advance in ${remaining} seconds`}`
- `src/components/list-editor/AssociationTable.tsx:393` — aria-label(dynamic): `aria-label={isExpanded ? 'Collapse detail' : 'Expand detail'}`
- `src/components/modals/AttemptAnalysisModal.tsx:235` — aria-label(dynamic): `aria-label={expandedIndex === i ? 'Contraer' : 'Expandir'}`
- `src/components/modals/CreateYouTubeDeckModal.tsx:134` — toast(var): `message`
- `src/components/modals/CreateYouTubeDeckModal.tsx:140` — toast(var): `GUEST_AI_SIGNUP_MESSAGE`
- `src/components/modals/CreateYouTubeDeckModal.tsx:157` — toast(var): `err.message`
- `src/components/modals/CreateYouTubeDeckModal.tsx:180` — toast(var): `GUEST_AI_SIGNUP_MESSAGE`
- `src/components/modals/CreateYouTubeDeckModal.tsx:198` — toast(var): `err.message`
- `src/components/modals/settings/RangeSliderField.tsx:42` — aria-label(dynamic): `aria-label={label}`
- `src/components/modals/settings/SelectField.tsx:27` — aria-label(dynamic): `aria-label={ariaLabel \|\| label}`
- `src/components/modals/settings/VoiceSection.tsx:294` — aria-label(dynamic): `aria-label={ariaLabel}`
- `src/components/onboarding/DeckCategorySelector.tsx:92` — aria-label(dynamic): `aria-label={ARIA_LABELS[category]}`
- `src/components/onboarding/DeckDistributionList.tsx:120` — aria-label(dynamic): `aria-label={ariaLabel}`
- `src/components/onboarding/DeckStoreOnboarding.tsx:104` — toast(var): `error`
- `src/components/views/LandingValidationAnalysis.tsx:97` — aria-label(dynamic): `aria-label={`
- `src/components/views/SettingsView.tsx:73` — toast(var): `PREMIUM_TOAST_CHECKOUT_CANCELED`
- `src/components/views/SettingsView.tsx:97` — toast(var): `PREMIUM_TOAST_UPGRADED`
- `src/components/views/SettingsView.tsx:104` — toast(var): `PREMIUM_TOAST_PENDING`
- `src/components/views/SettingsView.tsx:127` — toast(var): `PREMIUM_TOAST_RECORDING_REQUIRED`
- `src/components/views/SettingsView.tsx:143` — toast(var): `PREMIUM_TOAST_GUARD`
- `src/components/views/SettingsView.tsx:154` — toast(var): `PREMIUM_TOAST_ALREADY_PREMIUM`
- `src/components/views/SettingsView.tsx:166` — toast(var): `PREMIUM_TOAST_CHECKOUT_ERROR`
- `src/components/views/game/GameHeaderMobileToggle.tsx:46` — aria-label(dynamic): `aria-label={isVoiceActive ? "Disable voice" : "Enable voice"}`
- `src/hooks/app/useAppHandlers.ts:90` — toast(var): `error`
- `src/hooks/app/useAppHandlers.ts:160` — toast(var): `QUOTA_UNKNOWN_MESSAGE`
- `src/hooks/app/useAppHandlers.ts:211` — toast(var): `QUOTA_UNKNOWN_MESSAGE`
- `src/hooks/app/useAppHandlers.ts:284` — toast(var): `error`
- `src/hooks/app/useAppHandlers.ts:394` — toast(var): `error`
- `src/hooks/app/useAppHandlers.ts:475` — toast(var): `errorMessage`
- `src/hooks/app/useAppHandlers.ts:523` — toast(var): `errorMessage`
- `src/hooks/app/useAppHandlers.ts:561` — toast(var): `error`
- `src/hooks/dashboard/useListEditorActions.ts:125` — toast(var): `QUOTA_UNKNOWN_MESSAGE`
- `src/hooks/dashboard/useListEditorActions.ts:225` — toast(var): `QUOTA_UNKNOWN_MESSAGE`
- `src/hooks/dashboard/useListEditorActions.ts:370` — toast(var): `error`
- `src/hooks/dashboard/useListEditorActions.ts:443` — toast(var): `QUOTA_UNKNOWN_MESSAGE`
- `src/hooks/dashboard/useListEditorActions.ts:571` — toast(var): `ids.length`
- `src/hooks/dashboard/useListEditorTranslation.ts:88` — toast(var): `error`
- `src/pages/Login.tsx:21` — toast(var): `error`
- `src/pages/Login.tsx:100` — aria-label(dynamic): `aria-label={showPassword ? 'Hide password' : 'Show password'}`

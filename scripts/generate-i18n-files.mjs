import fs from 'fs';
import path from 'path';

const baseDir = path.join(process.cwd(), 'src/i18n');
const namespaces = [
  'nav',
  'auth',
  'dashboard',
  'game',
  'editor',
  'store',
  'onboarding',
  'settings',
  'errors'
];

const ptNav = {
  "panel": "Painel",
  "actividad": "Atividade",
  "reportes": "Relatórios",
  "ajustes": "Configurações",
  "anadir_valor": "Adicionar valor",
  "anadir": "Adicionar",
  "actividad_2": "Atividade",
  "reportes_2": "Relatórios",
  "admin": "Admin",
  "ajustes_2": "Configurações",
  "sincronizando": "Sincronizando...",
  "sincronizar": "Sincronizar",
  "cerrar": "Fechar",
  "auto_advance_in_seconds": "Avanço automático em {{seconds}} segundos",
  "algo_salio_mal": "Algo deu errado",
  "ocurrio_un_error_inesperado_puedes_intenta": "Ocorreu um erro inesperado. Tente novamente ou recarregue a página.",
  "ver_detalles_del_error": "Ver detalhes do erro",
  "reintentar": "Tentar novamente",
  "recargar_pagina": "Recarregar página",
  "repasos": "revisões",
  "meta_diaria": "Meta diária",
  "dia": "dia",
  "dias": "dias",
  "racha": "Sequência",
  "iniciada_el": "Iniciada em {{date}}",
  "hoy_por_estado": "Hoje por estado",
  "cambiar_meta": "Alterar meta",
  "modo_invitado_tus_datos_son_temporales_sol": "Modo convidado: seus dados são temporários, apenas neste navegador.",
  "cerrar_aviso": "Fechar aviso",
  "calculando_limites": "Calculando limites…",
  "no_se_pudieron_cargar_tus_limites": "Não foi possível carregar seus limites",
  "no_pudimos_verificar_tu_tier_podrias_ver_l": "Não foi possível verificar seu nível.",
  "reintentar_2": "Tentar novamente",
  "estas_acercandote_al_limite_de_tarjetas": "Você está se aproximando do limite de cartas",
  "te_quedan_pocas_tarjetas_disponibles": "Restam poucas cartas disponíveis",
  "llegaste_al_limite_de_tarjetas": "Você atingiu o limite de cartas",
  "elimina_o_archiva_tarjetas_para_poder_crea": "Exclua ou arquive cartas para criar novas listas.",
  "considera_organizar_o_archivar_tarjetas": "Considere organizar ou arquivar cartas que já domina.",
  "reintentar_3": "Tentar novamente",
  "menu_de_usuario": "Menu do usuário",
  "ajustes_3": "Configurações",
  "cerrar_sesion": "Sair",
  "usuario": "Usuário",
  "invitado": "Convidado",
  "idioma": "Idioma",
  "espanol": "Espanhol",
  "ingles": "Inglês"
};

const frNav = {
  "panel": "Tableau de bord",
  "actividad": "Activité",
  "reportes": "Rapports",
  "ajustes": "Paramètres",
  "anadir_valor": "Ajouter una valeur",
  "anadir": "Ajouter",
  "actividad_2": "Activité",
  "reportes_2": "Rapports",
  "admin": "Admin",
  "ajustes_2": "Paramètres",
  "sincronizando": "Synchronisation...",
  "sincronizar": "Synchroniser",
  "cerrar": "Fermer",
  "auto_advance_in_seconds": "Avance automatique dans {{seconds}} secondes",
  "algo_salio_mal": "Un problème est survenu",
  "ocurrio_un_error_inesperado_puedes_intenta": "Une erreur inattendue s'est produite. Vous pouvez réessayer ou recharger la page.",
  "ver_detalles_del_error": "Voir les détails de l'erreur",
  "reintentar": "Réessayer",
  "recargar_pagina": "Recharger la page",
  "repasos": "révisions",
  "meta_diaria": "Objectif quotidien",
  "dia": "jour",
  "dias": "jours",
  "racha": "Série",
  "iniciada_el": "Commencé le {{date}}",
  "hoy_por_estado": "Aujourd'hui par statut",
  "cambiar_meta": "Changer d'objectif",
  "modo_invitado_tus_datos_son_temporales_sol": "Mode invité : vos données sont temporaires, uniquement dans ce navigateur.",
  "cerrar_aviso": "Fermer l'avis",
  "calculando_limites": "Calcul des limites…",
  "no_se_pudieron_cargar_tus_limites": "Impossible de charger vos limites",
  "no_pudimos_verificar_tu_tier_podrias_ver_l": "Impossible de vérifier votre niveau.",
  "reintentar_2": "Réessayer",
  "estas_acercandote_al_limite_de_tarjetas": "Vous approchez de la limite de cartes",
  "te_quedan_pocas_tarjetas_disponibles": "Il vous reste peu de cartes disponibles",
  "llegaste_al_limite_de_tarjetas": "Vous avez atteint la limite de cartes",
  "elimina_o_archiva_tarjetas_para_poder_crea": "Supprimez ou archivez des cartes pour créer de novos decks.",
  "considera_organizar_o_archivar_tarjetas": "Pensez à organiser ou archiver les cartes que vous maîtrisez déjà.",
  "reintentar_3": "Réessayer",
  "menu_de_usuario": "Menu utilisateur",
  "ajustes_3": "Paramètres",
  "cerrar_sesion": "Déconnexion",
  "usuario": "Utilisateur",
  "invitado": "Invité",
  "idioma": "Langue",
  "espanol": "Espagnol",
  "ingles": "Anglais"
};

const deNav = {
  "panel": "Dashboard",
  "actividad": "Aktivität",
  "reportes": "Berichte",
  "ajustes": "Einstellungen",
  "anadir_valor": "Wert hinzufügen",
  "anadir": "Hinzufügen",
  "actividad_2": "Aktivität",
  "reportes_2": "Berichte",
  "admin": "Admin",
  "ajustes_2": "Einstellungen",
  "sincronizando": "Synchronisiere...",
  "sincronizar": "Synchronisieren",
  "cerrar": "Schließen",
  "auto_advance_in_seconds": "Automatischer Weiterlauf in {{seconds}} Sekunden",
  "algo_salio_mal": "Etwas ist schiefgelaufen",
  "ocurrio_un_error_inesperado_puedes_intenta": "Ein unerwarteter Fehler ist aufgetreten. Bitte versuche es erneut oder lade die Seite neu.",
  "ver_detalles_del_error": "Fehlerdetails anzeigen",
  "reintentar": "Wiederholen",
  "recargar_pagina": "Seite neu laden",
  "repasos": "Wiederholungen",
  "meta_diaria": "Tagesziel",
  "dia": "Tag",
  "dias": "Tage",
  "racha": "Serie",
  "iniciada_el": "Gestartet am {{date}}",
  "hoy_por_estado": "Heute nach Status",
  "cambiar_meta": "Ziel ändern",
  "modo_invitado_tus_datos_son_temporales_sol": "Gastmodus: Deine Daten sind temporär, nur in diesem Browser.",
  "cerrar_aviso": "Hinweis schließen",
  "calculando_limites": "Berechne Limits…",
  "no_se_pudieron_cargar_tus_limites": "Deine Limits konnten nicht geladen werden",
  "no_pudimos_verificar_tu_tier_podrias_ver_l": "Dein Status konnte nicht überprüft werden.",
  "reintentar_2": "Wiederholen",
  "estas_acercandote_al_limite_de_tarjetas": "Du näherst dich dem Kartenlimit",
  "te_quedan_pocas_tarjetas_disponibles": "Du hast nur noch wenige Karten verfügbar",
  "llegaste_al_limite_de_tarjetas": "Du hast das Kartenlimit erreicht",
  "elimina_o_archiva_tarjetas_para_poder_crea": "Lösche oder archiviere Karten, um neue Decks zu erstellen.",
  "considera_organizar_o_archivar_tarjetas": "Überlege, bereits gemeisterte Karten zu archivieren.",
  "reintentar_3": "Wiederholen",
  "menu_de_usuario": "Benutzermenü",
  "ajustes_3": "Einstellungen",
  "cerrar_sesion": "Abmelden",
  "usuario": "Benutzer",
  "invitado": "Gast",
  "idioma": "Sprache",
  "espanol": "Spanisch",
  "ingles": "Englisch"
};

const zhNav = {
  "panel": "仪表板",
  "actividad": "活动",
  "reportes": "报告",
  "ajustes": "设置",
  "anadir_valor": "添加值",
  "anadir": "添加",
  "actividad_2": "活动",
  "reportes_2": "报告",
  "admin": "管理员",
  "ajustes_2": "设置",
  "sincronizando": "正在同步...",
  "sincronizar": "同步",
  "cerrar": "关闭",
  "auto_advance_in_seconds": "{{seconds}} 秒后自动前进",
  "algo_salio_mal": "出错了",
  "ocurrio_un_error_inesperado_puedes_intenta": "发生意外错误。您可以重试或刷新页面。",
  "ver_detalles_del_error": "查看错误详情",
  "reintentar": "重试",
  "recargar_pagina": "刷新页面",
  "repasos": "复习",
  "meta_diaria": "每日目标",
  "dia": "天",
  "dias": "天",
  "racha": "连胜",
  "iniciada_el": "开始于 {{date}}",
  "hoy_por_estado": "今日状态",
  "cambiar_meta": "更改目标",
  "modo_invitado_tus_datos_son_temporales_sol": "访客模式：您的数据是临时的，仅保存在此浏览器中。",
  "cerrar_aviso": "关闭提示",
  "calculando_limites": "正在计算限制…",
  "no_se_pudieron_cargar_tus_limites": "无法加载您的限制",
  "no_pudimos_verificar_tu_tier_podrias_ver_l": "无法验证您的等级。",
  "reintentar_2": "重试",
  "estas_acercandote_al_limite_de_tarjetas": "您即将达到卡片上限",
  "te_quedan_pocas_tarjetas_disponibles": "剩余可用卡片不多",
  "llegaste_al_limite_de_tarjetas": "您已达到卡片上限",
  "elimina_o_archiva_tarjetas_para_poder_crea": "删除或归档卡片以创建新卡组。",
  "considera_organizar_o_archivar_tarjetas": "考虑整理或归档已掌握的卡片。",
  "reintentar_3": "重试",
  "menu_de_usuario": "用户菜单",
  "ajustes_3": "设置",
  "cerrar_sesion": "退出登录",
  "usuario": "用户",
  "invitado": "访客",
  "idioma": "语言",
  "espanol": "西班牙语",
  "ingles": "英语"
};

const navMap = { pt: ptNav, fr: frNav, de: deNav, zh: zhNav };

for (const lang of ['pt', 'fr', 'de', 'zh']) {
  const langDir = path.join(baseDir, lang);
  if (!fs.existsSync(langDir)) {
    fs.mkdirSync(langDir, { recursive: true });
  }

  // Write custom nav.json
  fs.writeFileSync(path.join(langDir, 'nav.json'), JSON.stringify(navMap[lang], null, 2));

  // Copy or fallback english content for other namespaces
  for (const ns of namespaces) {
    if (ns === 'nav') continue;
    const enFile = path.join(baseDir, 'en', `${ns}.json`);
    const targetFile = path.join(langDir, `${ns}.json`);
    if (!fs.existsSync(targetFile) && fs.existsSync(enFile)) {
      fs.copyFileSync(enFile, targetFile);
    }
  }
}

console.log('Language files generated successfully.');

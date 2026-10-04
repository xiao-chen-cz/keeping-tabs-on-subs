export const TABS_COOKIE = "kts_tabs";

/** Tabs are on unless the cookie says "off". */
export const tabsEnabledFrom = (cookieValue: string | undefined) => cookieValue !== "off";

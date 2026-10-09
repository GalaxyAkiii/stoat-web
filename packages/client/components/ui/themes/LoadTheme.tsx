import { createEffect, createMemo } from "solid-js";

import { useClientLifecycle } from "@revolt/client";
import { State } from "@revolt/client/Controller";
import { useDevice } from "@revolt/common";
import { useState } from "@revolt/state";

import {
  createMaterialColourVariables,
  createMduiColourTriplets,
  createStoatWebVariables,
} from ".";
import { SlideState } from "../components/navigation/SlideDrawer";
import { Masks } from "./Masks";
import { FONTS, MONOSPACE_FONTS } from "./fonts";
import { legacyThemeUnsetShim } from "./legacyThemeGeneratorCode";

/**
 * Component for loading theme variables into root
 */
export function LoadTheme() {
  const state = useState();
  const { lifecycle } = useClientLifecycle();
  const { isIOSTouch } = useDevice();

  const bannerShown = createMemo(() =>
    [
      State.Connecting,
      State.Disconnected,
      State.Reconnecting,
      State.Offline,
    ].includes(lifecycle.state()),
  );

  const getCssProps = createMemo(() => {
    const activeTheme = state.theme.activeTheme;

    return {
      // create unset variables to indicate where colours need replacing
      ...Object.keys(legacyThemeUnsetShim().colours).reduce(
        (d, k) => ({
          ...d,
          [`--colours-${k}`]: k.includes("background")
            ? "var(--unset-bg)"
            : "var(--unset-fg)",
        }),
        {},
      ),
      // mount Stoat for Web variables
      ...createStoatWebVariables(activeTheme),
      // mount --md-sys-color variables
      ...createMaterialColourVariables(activeTheme, "--md-sys-color-"),
      // mount --mdui-color triplet variables
      ...createMduiColourTriplets(activeTheme, "--mdui-color-"),
    };
  });

  //Load fonts & update CSS props on body
  createEffect(() => {
    FONTS[state.theme.interfaceFont].load();
    MONOSPACE_FONTS[state.theme.monospaceFont].load();

    const cssProps = getCssProps();
    for (const [key, value] of Object.entries(cssProps))
      document.body.style.setProperty(key, value);
  });

  //Set PWA theme color
  createEffect(() => {
    // Include SHOWING so colours change as the slide starts, not after it ends
    const isShown = (slideState?: SlideState) =>
      slideState === SlideState.SHOWN || slideState === SlideState.SHOWING;

    const drawerShown =
      isShown(state.appDrawer()?.state) || isShown(state.diagDrawer()?.state);

    const color =
      getCssProps()[
        bannerShown()
          ? "--md-sys-color-primary-container"
          : drawerShown
            ? "--md-sys-color-surface-container-low"
            : "--md-sys-color-surface-container-high"
      ];

    for (const meta of document.head.querySelectorAll("meta[name=theme-color]"))
      (meta as HTMLMetaElement).content = color;

    // Match <html> background with bottom edge color for iOS safe-area sampling
    const bottomColor =
      getCssProps()[
        drawerShown
          ? "--md-sys-color-surface-container-lowest"
          : "--md-sys-color-surface-container-high"
      ];

    document.documentElement.style.background = bottomColor;
    document.body.style.background = bottomColor;
  });

  // Set system color-scheme so iOS keyboard accessory bar matches theme
  if (isIOSTouch) {
    createEffect(() => {
      document.documentElement.style.colorScheme = state.theme.activeTheme
        .darkMode
        ? "dark"
        : "light";
    });
  }

  return <Masks />;
}

import React, { useCallback, useContext, useRef } from 'react';
import { SectionList, View, type SectionListProps } from 'react-native';
import { GuideContext, GuideScrollContext, measure, type Measurable } from './GuideContext';

/** Mantiene la virtualización; las guías usan la primera fila como ejemplo. */
export function GuideSectionList<Item, Section>({ onScroll, ...props }: SectionListProps<Item, Section>) {
  const list = useRef<SectionList<Item, Section>>(null);
  const viewport = useRef<View>(null);
  const offset = useRef(0);
  const context = useContext(GuideContext);
  const reveal = useCallback(async (node: Measurable) => {
    const [target, frame] = await Promise.all([measure(node), measure(viewport.current)]);
    if (!target || !frame) return;
    if (target.y < frame.y + 8 || target.y + target.height > frame.y + frame.height - 220) {
      list.current?.getScrollResponder()?.scrollTo({ y: Math.max(0, offset.current + target.y - frame.y - 80), animated: false });
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }, []);
  return <GuideScrollContext.Provider value={reveal}><View ref={viewport} collapsable={false} style={{ flex: 1 }}>
    <SectionList {...props} ref={list} scrollEnabled={context?.active ? false : props.scrollEnabled} removeClippedSubviews={false}
      scrollEventThrottle={16} onScroll={event => { offset.current = event.nativeEvent.contentOffset.y; onScroll?.(event); }} />
  </View></GuideScrollContext.Provider>;
}

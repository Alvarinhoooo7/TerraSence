import React, { createContext, useContext, useEffect, useId, useRef } from 'react';
import { View } from 'react-native';
import type { GuideRect } from '../../utils/guideLayout';

export type Measurable = Pick<View, 'measureInWindow'>;
export interface GuideTarget {
  id: string;
  node: React.RefObject<Measurable | null>;
  title: string;
  description: string;
  reveal?: (node: Measurable) => Promise<void>;
}
export const GuideContext = createContext<{ register: (target: GuideTarget) => () => void; active: boolean; close: () => void } | null>(null);
export const GuideScrollContext = createContext<GuideTarget['reveal']>(undefined);
export function useResetGuide(scope: string) {
  const close = useContext(GuideContext)?.close;
  useEffect(() => { close?.(); }, [scope, close]);
}
export const measure = (node: Measurable | null): Promise<GuideRect | null> => new Promise(resolve => {
  if (!node) { resolve(null); return; }
  const timeout = setTimeout(() => resolve(null), 400);
  node.measureInWindow((x, y, width, height) => { clearTimeout(timeout); resolve(width && height ? { x, y, width, height } : null); });
});

export function useGuideTarget(title: string, description: string, enabled = true) {
  const context = useContext(GuideContext);
  const reveal = useContext(GuideScrollContext);
  const id = useId();
  const node = useRef<View>(null);
  const register = context?.register;
  useEffect(() => {
    if (!enabled || !title || !register) return;
    return register({ id, node, title, description, reveal });
  }, [id, register, title, description, reveal, enabled]);
  return node;
}

export function guideText(children: React.ReactNode): string {
  return React.Children.toArray(children).map(child => {
    if (typeof child === 'string' || typeof child === 'number') return String(child);
    if (React.isValidElement<{ children?: React.ReactNode }>(child)) return guideText(child.props.children);
    return '';
  }).join(' ').replace(/\s+/g, ' ').trim();
}

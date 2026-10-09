import type { ExportProfile } from './profiles';

/**
 * Shared layout metrics in logical points. Components read the same numbers via CSS
 * custom properties (see layoutVars) so pagination estimates and rendered layout agree.
 */
export interface ConversationMetrics {
  fontSize: number;
  lineHeight: number;
  bubblePadY: number;
  bubblePadX: number;
  bubbleMaxWidth: number;
  /** Text width inside a bubble (bubble max minus padding, minus a safety margin). */
  textMaxWidth: number;
  headerHeight: number;
  composerHeight: number;
  areaPadTop: number;
  areaPadBottom: number;
  gapSameSender: number;
  gapNewSender: number;
  senderLabelHeight: number;
  reactionSpace: number;
  receiptHeight: number;
  timestampHeight: number;
  typingHeight: number;
  systemHeight: number;
  imageAttachmentHeight: number;
  cardAttachmentHeight: number;
  groupAvatarSpace: number;
}

export function conversationMetrics(profile: ExportProfile, fontScale = 1, isGroup = false): ConversationMetrics {
  const fontSize = Math.round(17 * fontScale * 10) / 10;
  const lineHeight = Math.round(22 * fontScale);
  const groupAvatarSpace = isGroup ? 36 : 0;
  const bubbleMaxWidth = Math.round(profile.width * 0.72) - (isGroup ? 12 : 0);
  return {
    fontSize,
    lineHeight,
    bubblePadY: 7,
    bubblePadX: 12,
    bubbleMaxWidth,
    textMaxWidth: bubbleMaxWidth - 24 - 4,
    headerHeight: profile.id === 'iphone' ? 96 : 84,
    composerHeight: 52,
    areaPadTop: 8,
    areaPadBottom: 8,
    gapSameSender: 2,
    gapNewSender: 10,
    senderLabelHeight: 16,
    reactionSpace: 14,
    receiptHeight: 17,
    timestampHeight: 34,
    typingHeight: 38,
    systemHeight: 30,
    imageAttachmentHeight: 184,
    cardAttachmentHeight: 62,
    groupAvatarSpace,
  };
}

export function conversationCapacity(profile: ExportProfile, m: ConversationMetrics, showComposer: boolean, showStatusBar: boolean): number {
  return (
    profile.height -
    (showStatusBar ? profile.statusBarHeight : 0) -
    m.headerHeight -
    (showComposer ? m.composerHeight : 0) -
    profile.homeIndicatorHeight -
    m.areaPadTop -
    m.areaPadBottom
  );
}

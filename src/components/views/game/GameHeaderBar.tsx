import { GameHeader } from "../../game/GameHeader";
import type { GameHeaderBarProps } from "../../../types/game-view";

export function GameHeaderBar(props: GameHeaderBarProps) {
  const {
    list,
    currentIndex,
    queueLength,
    cycle4Count,
    goalProgress,
    goalTarget,
    sessionRepasos,
    isVoiceActive,
    isRecording,
    isPremium,
    isPresentationMode,
    onBack,
    onSettings,
    onRestart,
    onToggleVoice,
    onToggleRecord,
    onViewRecordings,
    onTogglePractice,
  } = props;

  return (
    <GameHeader
      listName={list.name}
      currentIndex={currentIndex}
      queueLength={queueLength}
      cycle4Count={cycle4Count}
      gameMode={list.settings.mode}
      goalProgress={goalProgress}
      goalTarget={goalTarget}
      sessionRepasos={sessionRepasos}
      onBack={onBack}
      onSettingsClick={onSettings}
      onRestart={onRestart}
      voiceEnabled={isVoiceActive}
      onVoiceToggle={onToggleVoice}
      isPremium={isPremium}
      isRecording={isRecording}
      onRecordToggle={onToggleRecord}
      onViewRecordings={onViewRecordings}
      isPresentationActive={isPresentationMode}
      onPracticeToggle={onTogglePractice}
    />
  );
}
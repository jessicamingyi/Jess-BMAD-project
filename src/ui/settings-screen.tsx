import { useId, type Ref } from 'react'
import { copy } from '../content/copy.ts'
import type { SettingName, Settings } from '../game/types.ts'
import './settings.css'

type Props = {
  settings: Settings
  onToggle: (setting: SettingName) => void
  /** The page heading; focused (tabIndex -1) after the nav opens Settings. */
  headingRef?: Ref<HTMLHeadingElement>
}

const ASSISTS = [
  { setting: 'mistakeHighlighting', label: copy.settingMistakeHighlighting },
  { setting: 'sameDigitHighlighting', label: copy.settingSameDigitHighlighting },
  { setting: 'unitHighlighting', label: copy.settingUnitHighlighting },
] as const satisfies readonly { setting: SettingName; label: string }[]

type ToggleProps = { label: string; on: boolean; onToggle: () => void }

/**
 * Settings toggle (UX-DR17): label left, state word right. A native button with
 * role="switch", so click and Space flip it; aria-checked mirrors the word.
 */
function SettingToggle({ label, on, onToggle }: ToggleProps) {
  return (
    <button type="button" role="switch" aria-checked={on} className="settings-toggle" onClick={onToggle}>
      <span className="settings-toggle-label">{label}</span>
      <span className={on ? 'settings-toggle-state settings-toggle-state--on' : 'settings-toggle-state'} aria-hidden="true">
        {on ? copy.settingOn : copy.settingOff}
      </span>
    </button>
  )
}

/** Settings: the three Assists, then Lamplight below a hairline rule. Changes apply at once and record no Undo. */
export function SettingsScreen({ settings, onToggle, headingRef }: Props) {
  const assistsId = useId()
  return (
    <section className="settings-screen">
      <h1 className="settings-heading" tabIndex={-1} ref={headingRef}>
        {copy.settingsHeading}
      </h1>
      <div className="settings-group" role="group" aria-labelledby={assistsId}>
        <p className="settings-group-label" id={assistsId}>
          {copy.settingsAssists}
        </p>
        {ASSISTS.map(({ setting, label }) => (
          <SettingToggle key={setting} label={label} on={settings[setting]} onToggle={() => onToggle(setting)} />
        ))}
      </div>
      <hr className="settings-rule" />
      <SettingToggle label={copy.settingLamplight} on={settings.lamplight} onToggle={() => onToggle('lamplight')} />
    </section>
  )
}

import { useEffect, useState } from 'preact/hooks';
import type { JSX } from 'preact';
import { Switch } from '@/ui/components/Switch';
import { SelectField, TextField } from '@/ui/components/TextField';
import { updateSettings } from '@/core/settings/store';
import { settings } from '@/core/state/signals';
import { isValidTemplate } from '@/core/util/url';
import { t } from '@/locales';
import { engineOptions } from '@/ui/actions/data';
import { SettingsSection } from './SettingsSection';
import { SETTINGS_SEARCH_ID } from './sections';

/** `custom` is a real engine id (see `buildSearchUrl`); it has no preset template. */
const CUSTOM_ENGINE_ID = 'custom';

/**
 * Search engine, custom template and result behaviour.
 *
 * The template is the one field that cannot be written on every keystroke: the
 * settings store rejects a template that is not yet a usable URL, so a draft is
 * kept locally and only committed once it validates. Any change made elsewhere
 * (another tab, an import) drops the draft and wins.
 */
export function SearchSection(): JSX.Element {
  const search = settings.value.search;
  const [templateDraft, setTemplateDraft] = useState<string | null>(null);
  const engines = engineOptions();
  const engine = search.engine;
  const committedTemplate = search.customTemplate;
  const template = templateDraft ?? committedTemplate;
  const invalidTemplate = template.trim().length > 0 && !isValidTemplate(template);
  const engineChoices = [
    ...engines.map((option) => ({ value: option.id, label: option.label })),
    ...(engines.some((option) => option.id === CUSTOM_ENGINE_ID)
      ? []
      : [{ value: CUSTOM_ENGINE_ID, label: t('settings.customTemplate') }]),
  ];

  useEffect(() => {
    setTemplateDraft(null);
  }, [committedTemplate, engine]);

  return (
    <SettingsSection id={SETTINGS_SEARCH_ID} title={t('settings.section.search')}>
      <SelectField
        id="settings-engine"
        label={t('settings.engine')}
        value={engine}
        options={engineChoices}
        onChange={(next) => updateSettings({ search: { engine: next } })}
      />
      <TextField
        id="settings-custom-template"
        label={t('settings.customTemplate')}
        value={template}
        disabled={engine !== CUSTOM_ENGINE_ID}
        placeholder="https://example.com/search?q=%s"
        hint={t('settings.customTemplate.hint')}
        error={invalidTemplate ? t('settings.customTemplate.invalid') : null}
        onInput={(next) => {
          setTemplateDraft(next);
          if (next.trim().length === 0 || isValidTemplate(next)) {
            updateSettings({ search: { customTemplate: next } });
          }
        }}
        onBlur={() => {
          if (templateDraft !== null && !invalidTemplate && templateDraft !== committedTemplate) {
            updateSettings({ search: { customTemplate: templateDraft } });
          }
        }}
      />
      <Switch
        label={t('settings.openInNewTab')}
        checked={search.openInNewTab}
        onChange={(openInNewTab) => updateSettings({ search: { openInNewTab } })}
      />
      <Switch
        label={t('settings.showFavicons')}
        description={t('settings.showFavicons.hint')}
        checked={search.showFavicons}
        onChange={(showFavicons) => updateSettings({ search: { showFavicons } })}
      />
    </SettingsSection>
  );
}

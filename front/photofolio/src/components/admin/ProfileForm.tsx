'use client';

import { useState } from 'react';
import { updateProfile } from '@/app/(admin)/admin/actions';
import type { ActionFailure } from '@/lib/admin/types';
import { BIO_MAX_LENGTH, type Profile } from '@/lib/profile';
import ErrorNotice from './ErrorNotice';
import { inputClass, labelClass, primaryButtonClass } from './styles';

export default function ProfileForm({ profile }: { profile: Profile }) {
  const [values, setValues] = useState(profile);
  const [failure, setFailure] = useState<ActionFailure | null>(null);
  const [pending, setPending] = useState(false);
  const [saved, setSaved] = useState(false);

  function change(field: keyof Profile) {
    return (event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
      setValues({ ...values, [field]: event.target.value });
      setSaved(false);
    };
  }

  async function handleSave(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setFailure(null);
    const result = await updateProfile(values);
    setPending(false);
    if (result.ok) {
      setValues(result.profile);
      setSaved(true);
    } else {
      setFailure(result);
    }
  }

  return (
    <form onSubmit={handleSave} className="flex max-w-[600px] flex-col gap-5">
      <div>
        <label htmlFor="profile-bio" className={labelClass}>Bio</label>
        <textarea
          id="profile-bio"
          value={values.bio}
          onChange={change('bio')}
          rows={10}
          maxLength={BIO_MAX_LENGTH}
          className={`${inputClass} resize-y leading-[1.7]`}
        />
        <p className="mt-1.5 text-[11px] text-muted">
          Leave a blank line between paragraphs. {values.bio.length}/{BIO_MAX_LENGTH}
        </p>
      </div>
      <div>
        <label htmlFor="profile-email" className={labelClass}>Email</label>
        <input id="profile-email" type="email" value={values.email} onChange={change('email')} className={inputClass} />
      </div>
      <div>
        <label htmlFor="profile-instagram" className={labelClass}>Instagram</label>
        <input
          id="profile-instagram"
          value={values.instagram}
          onChange={change('instagram')}
          placeholder="@yourname"
          className={inputClass}
        />
        <p className="mt-1.5 text-[11px] text-muted">Leave the email or Instagram empty to hide that link.</p>
      </div>
      <ErrorNotice failure={failure} />
      <div className="flex items-center gap-4">
        <button type="submit" disabled={pending} className={primaryButtonClass}>
          {pending ? 'Saving…' : 'Save'}
        </button>
        {saved && <p role="status" className="text-xs text-muted">Saved.</p>}
      </div>
    </form>
  );
}

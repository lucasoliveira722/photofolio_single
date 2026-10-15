import { connection } from 'next/server';
import { getProfile } from '@/lib/api';
import { bioParagraphs, type Profile } from '@/lib/profile';

const contactLinkClass = 'text-[10px] uppercase tracking-[0.18em] text-muted transition-colors hover:text-ink';

export default async function ProfileIntro() {
  // Render at request time so a bio saved in the admin shows on the next visit.
  await connection();

  let profile: Profile;
  try {
    profile = await getProfile();
  } catch {
    return null;
  }

  return (
    <>
      {bioParagraphs(profile.bio).map((paragraph, index) => (
        <p key={index} className="mb-4 whitespace-pre-line leading-[1.8] text-muted last:mb-0">
          {paragraph}
        </p>
      ))}
      {(profile.email || profile.instagram) && (
        <div className="mt-10 flex gap-6">
          {profile.email && <a href={`mailto:${profile.email}`} className={contactLinkClass}>Email</a>}
          {profile.instagram && (
            <a href={`https://instagram.com/${profile.instagram}`} className={contactLinkClass}>Instagram</a>
          )}
        </div>
      )}
    </>
  );
}

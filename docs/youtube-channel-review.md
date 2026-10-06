# Remaining YouTube channel review

Reviewed on 2026-10-06: all 1,113 YouTube bookmarks that still carried `not-reviewed` after the security conference review. The [complete review log](youtube-channel-review.csv) contains each saved channel, the public source checked, observed channel name, a short sample video title when available, previous and resulting tags, and added or removed topics.

Public channel descriptions and published video titles were checked for 1,106 channels. Failed video-page requests were retried using the channel's About page; remaining unavailable channels were also searched for corroborating public sources. This is a channel classification review; individual videos were not watched in full. Tags describe the observed channel content, rather than being inferred solely from its saved name or old category. Names, URLs, category memberships, subscriptions, and positions are preserved.

`not-reviewed` was removed from all 1,113 records as requested. Topics were added or corrected on 1,042 channels: 1,925 topic assignments added and 211 removed, excluding removal of the review marker. Examples include replacing John Hammond's podcast label with security topics, identifying Kika Studio as makeup, classifying Dan Carlin as history, correcting gaming and music channels previously tagged as sports, and replacing generic `other` tags where a clear focus could be established.

## Reusable tags

Use lowercase, hyphenated topic names. Keep broad topics where useful and add a small number of supported specific topics. Examples include `security` with `pentesting`, `ctf`, `malware-analysis`, `dfir`, `cloud-security`, or `reverse-engineering`; `sport-motorsport` with `basketball`, `football`, `rally`, `drifting`, or `formula-1`; and `science` with `physics`, `astronomy`, or `biology`. Recurring interviews use `podcasts`, and event recordings use `conferences`. Do not add `youtube` or `youtuber`, since collection and category metadata identify the platform.

Equivalent spellings introduced during the review were consolidated: `cloud` into `cloud-computing`, `digital-forensics` into `dfir`, and `pop` into `pop-music`. `cloud-security` remains a separate security topic. New specific tags require evidence from the content; unavailable evidence does not justify adding a topic.

## Unavailable content

Seven saved channel pages returned no usable description or video listings, or failed to load. Their existing topic tags were retained without new topic assignments. Their review markers were removed at the user's request, but their current content remains unverified. Related artist, publisher, or league pages do not establish what is currently published at these exact saved URLs.

| Channel | Outcome |
| --- | --- |
| [Mesijus X Münpauzn - Topic](https://www.youtube.com/channel/UCm-bLB7QD91V1wEggjlwxew/videos) | No usable public content |
| [UPROXX Music](https://www.youtube.com/@uproxxmusicvideos/videos) | Page unavailable |
| [CISO MAG](https://www.youtube.com/@cisomag1170/videos) | No usable public content |
| [Kindred Security](https://www.youtube.com/@KindredSecurity/videos) | No usable public content |
| [Dale Carnegie](https://www.youtube.com/@Dale-Carnegie/videos) | Page unavailable |
| [LKL, kurią remia Betsson](https://www.youtube.com/@LKLTV/videos) | Page unavailable |
| [Eurolygos turas](https://www.youtube.com/@eurolygos_turas/videos) | Page unavailable |

Future additions should carry `not-reviewed` until their review is processed. Record unavailable sources explicitly rather than treating removal of a queue marker as proof of current content.

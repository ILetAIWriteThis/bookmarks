# Web bookmark review

Reviewed on 2026-10-06: all 483 bookmarks in the Web collection, including 470 previously marked `not-reviewed`. The [complete review log](web-bookmark-review.csv) records each saved URL, public evidence URL, evidence scope, review outcome, and previous and resulting tags.

## Results

- Removed all 470 Web review markers.
- Added, corrected, or normalized topic tags on 359 bookmarks.
- 357 bookmarks had usable public content or supporting public publisher descriptions.
- 122 bookmarks remained unavailable or exposed only an access challenge, sign-in page, or incomplete app shell. Their existing topics were retained, with equivalent tag names normalized.
- Four resources were repurposed, retired, missing at the saved route, or redirected to a corporate site. These outcomes are recorded below.
- Names, URLs, category memberships, subscriptions, saved positions, and all YouTube records are preserved.

## Review method

Checked public titles, descriptions, headings, and page text. Retried unavailable deep links against publisher homepages where appropriate, used official product documentation for selected private app links, and rendered selected JavaScript sites in a fresh browser context. Indexed publisher descriptions were used where direct access remained blocked; the log distinguishes these from saved-page evidence. No account contents were inspected, no sign-in was performed, and no CTF challenges were executed. This is a topic classification review, not a full review of every article or a security assessment of each site.

Sources with no usable content did not receive inferred new topics. Removal of the queue marker means the review was processed; it does not assert that an inaccessible or obsolete link is working.

## Tagging conventions

Reuse the same vocabulary as the YouTube collection where it fits. Security resources now have supported topics such as `dfir`, `malware-analysis`, `cti`, `detection-engineering`, `cloud-security`, `reverse-engineering`, `osint`, `pentesting`, and `vulnerability-management`. Formats and purposes such as `blogs`, `newsletters`, `reference`, `education`, and `tools` are separate from topics.

Equivalent inherited names were consolidated across Web bookmarks:

| Previous tag | Reused tag |
| --- | --- |
| `ai` | `ai-machine-learning` |
| `ai-vendors` | `vendor` |
| `book` | `reading` |
| `tv` | `movies-tv` |
| `automotive` | `cars` |
| `dev` | `programming` |
| `finance-tracking` | `personal-finance` |
| `entertainment-tracking` | `tracking` |

Examples of content corrections include Ignitis Declaration (`utilities`, `bills`), Pamiršta.lt (`travel`, `urban-exploration`, `photography`), OneDrive (`productivity`, `cloud-storage`), Hackaday (`hardware`, `electronics`, `diy`, `engineering`), and The Old New Thing (`programming`, `windows-internals`). `daily` is preserved as a usage tag.

## Changed or retired resources

| Saved bookmark | Observed outcome |
| --- | --- |
| [Russian APT Ecosystem Map](https://apt-ecosystem.com/russia/map/) | Saved Russian APT map redirects to unrelated cryptocurrency content. |
| [Defend the Web](https://defendtheweb.net/?hackthis) | The platform explicitly announces a hiatus. |
| [Under the Wire](https://www.underthewire.tech/wargames.htm) | Saved training route displays a 404 message. |
| [Microcorruption](https://microcorruption.com/) | Saved Microcorruption challenge site redirects to NCC Group corporate content. |

Existing topics are retained for these resources; they are not silently reclassified as unrelated content or removed from the collection. The review log identifies the currently observed destination.

## Unavailable content

The following saved URLs could not be classified further. Some publishers were checked through another public page, but no usable evidence for these records was obtained.

| Bookmark | Outcome |
| --- | --- |
| [Amazon Wishlist](https://www.amazon.com/hz/wishlist/ls/1FX01SGXD597F?type=wishlist&filter=unpurchased&sort=price-asc&viewType=grid) | HTTP Error 503: Service Unavailable |
| [IMDb Watchlist](https://www.imdb.com/user/p.7z525yifhbsnosefkvnvhjri3y/watchlist/?sort=date_added%2Cdesc) | No usable public content |
| [Kindle Reading Insights](https://www.amazon.com/kindle/reading/insights#2026:false:0,37,46,4,0) | HTTP Error 503: Service Unavailable |
| [Go3](https://go3.lt/) | HTTP Error 403: Forbidden |
| [Best Sellers - Books](https://www.nytimes.com/books/best-sellers/) | HTTP Error 403: Forbidden |
| [Reading Length](https://www.readinglength.com/) | HTTP Error 403: Forbidden |
| [I Will Teach You To Be Rich](https://www.iwillteachyoutoberich.com/) | HTTP Error 403: Forbidden |
| [SparkNotes](https://www.sparknotes.com/) | HTTP Error 403: Forbidden |
| [Ali Abdaal Articles](https://aliabdaal.com/articles/) | HTTP Error 403: Forbidden |
| [BALTIC MUSTACHE - Finansinė nepriklausomybė iki 40 metų Lietuvoje](https://balticmustache.lt/) | No usable public content |
| [Get Disciplined](https://www.reddit.com/r/getdisciplined/best/) | HTTP Error 403: Blocked |
| [Better Humans](https://betterhumans.pub/) | HTTP Error 403: Forbidden |
| [eReaderIQ](https://www.ereaderiq.com/) | HTTP Error 403: Forbidden |
| [Motorsport.tv](https://motorsport.tv/) | HTTP Error 403: Forbidden |
| [Streameast](https://www.streameast.live/sa/) | TLS/certificate failure |
| [Red Bull TV](https://www.redbull.com/int-en/discover) | HTTP Error 403: Forbidden |
| [CodeAbbey](https://www.codeabbey.com/index/task_list) | HTTP Error 406: Not Acceptable |
| [Project Euler](https://projecteuler.net/) | HTTP Error 403: Forbidden |
| [LeetCode Problems](https://leetcode.com/problemset/) | HTTP Error 403: Forbidden |
| [Security Certification Roadmap - Paul Jerimy Media](https://pauljerimy.com/security-certification-roadmap/) | TLS/certificate failure |
| [Vx Underground](https://vx-underground.org/) | TLS/certificate failure |
| [OpenSecurityTraining](https://opensecuritytraining.info/Welcome.html) | HTTP Error 406: Not Acceptable |
| [Online Courses - Learn Anything, On Your Schedule /  Udemy](https://www.udemy.com/) | HTTP Error 403: Forbidden |
| [Linux Journey](https://linuxjourney.com/) | HTTP Error 403: Forbidden |
| [THE PROMPT for Security Copilot /  Rod Trent /  Substack](https://thecfsprompt.substack.com/) | HTTP Error 404: Not Found |
| [All things OSCP](https://www.reddit.com/r/oscp/new/) | HTTP Error 403: Blocked |
| [Antivirus](https://www.reddit.com/r/antivirus/new/) | HTTP Error 403: Blocked |
| [AskNetsec](https://www.reddit.com/r/AskNetsec/new/) | HTTP Error 403: Blocked |
| [Avanan /  Blog](https://www.avanan.com/blog) | HTTP Error 404: Not Found |
| [Blackhat Library: Hacking techniques and research](https://www.reddit.com/r/blackhat/new/) | HTTP Error 403: Blocked |
| [BleepingComputer](https://www.bleepingcomputer.com/) | HTTP Error 403: Forbidden |
| [Blogs /  AT&T Cybersecurity](https://cybersecurity.att.com/blogs) | HTTP Error 403: Forbidden |
| [Cisco Talos Blog](https://blog.talosintelligence.com/) | HTTP Error 403: Forbidden |
| [Computer Forensics](https://www.reddit.com/r/computerforensics/) | HTTP Error 403: Blocked |
| [Computer Security - IT security news, articles and tools](https://www.reddit.com/r/ComputerSecurity/new/) | HTTP Error 403: Blocked |
| [cryptography](https://www.reddit.com/r/cryptography/new/) | HTTP Error 403: Blocked |
| [CYBER GEEKS – All Things Infosec](https://cybergeeks.tech/) | HTTP Error 406: Not Acceptable |
| [cybersecurity](https://www.reddit.com/r/cybersecurity/new) | HTTP Error 403: Blocked |
| [Dark Reading](https://www.darkreading.com/) | HTTP Error 403: Forbidden |
| [Blue Team Security](https://www.reddit.com/r/blueteamsec/new/) | HTTP Error 403: Blocked |
| [Fortra](https://www.phishlabs.com/) | HTTP Error 403: Forbidden |
| [r/hacking](https://www.reddit.com/r/hacking/new/) | HTTP Error 403: Blocked |
| [Home - Active Countermeasures](https://www.activecountermeasures.com/) | HTTP Error 403: Forbidden |
| [CISO MAG](https://cisomag.com/) | HTTP Error 403: Forbidden |
| [Internet and Cloud Intelligence Blog](https://www.thousandeyes.com/blog/) | HTTP Error 403: Forbidden |
| [Medium: Bug Bounty](https://medium.com/tag/bug-bounty/latest) | HTTP Error 403: Forbidden |
| [Medium: Cybersecurity](https://medium.com/tag/cybersecurity/latest) | HTTP Error 403: Forbidden |
| [Medium: Threat Hunting](https://medium.com/tag/threat-hunting/latest) | HTTP Error 403: Forbidden |
| [r/Malware](https://www.reddit.com/r/Malware/new/) | HTTP Error 403: Blocked |
| [Microsoft Defender for Endpoint](https://www.reddit.com/r/DefenderATP/new/) | HTTP Error 403: Blocked |
| [Microsoft Security Blog](https://www.microsoft.com/en-us/security/blog/) | HTTP Error 403: Forbidden |
| [Microsoft Security Response Center](https://msrc.microsoft.com/blog/) | HTTP Error 403: Forbidden |
| [Naked Security – Computer Security News, Advice and Research](https://nakedsecurity.sophos.com/) | Request timed out |
| [netsecstudents: Subreddit for students studying Network Security and its related subjects](https://www.reddit.com/r/netsecstudents/new/) | HTTP Error 403: Blocked |
| [News Archives - Forensic Focus](https://www.forensicfocus.com/news/) | HTTP Error 403: Forbidden |
| [Post malware and hostile servers for others to analyze](https://www.reddit.com/r/MalwareAnalysis/new/) | HTTP Error 403: Blocked |
| [Red Team Security](https://www.reddit.com/r/redteamsec/new/) | HTTP Error 403: Blocked |
| [Reverse Engineering](https://www.reddit.com/r/ReverseEngineering/new/) | HTTP Error 403: Blocked |
| [Microsoft Security Update Guide](https://msrc.microsoft.com/update-guide/) | Public page still loading; no usable update entries. |
| [Security, Compliance, and Identity - Microsoft Community Hub](https://techcommunity.microsoft.com/t5/security-compliance-and-identity/ct-p/MicrosoftSecurityandCompliance) | No usable public content |
| [r/securityCTF](https://www.reddit.com/r/securityCTF/new/) | HTTP Error 403: Blocked |
| [securitycurrent.com](https://securitycurrent.com/) | HTTP Error 403: Forbidden |
| [SIEM Platform & Security Operations Center Services /  LogRhythm](https://logrhythm.com/) | HTTP Error 403: Forbidden |
| [Social Engineering](https://www.reddit.com/r/SocialEngineering/new/) | HTTP Error 403: Blocked |
| [Sophos News – The Sophos Blog](https://news.sophos.com/en-us/) | Request timed out |
| [r/netsec](https://www.reddit.com/r/netsec/new/) | HTTP Error 403: Blocked |
| [The Cyber Triage Blog: Product news and DFIR training](https://www.cybertriage.com/blog/) | HTTP Error 403: Forbidden |
| [Medium: Detection Engineering](https://medium.com/tag/detection-engineering) | HTTP Error 403: Forbidden |
| [Threat Geek Blog - Fidelis Cybersecurity](https://fidelissecurity.com/threatgeek/) | HTTP Error 403: Forbidden |
| [Tripwire /  Security and Integrity Management Solutions](https://www.tripwire.com/) | HTTP Error 403: Forbidden |
| [Windows Security](https://www.reddit.com/r/WindowsSecurity/new/) | HTTP Error 403: Blocked |
| [Your Hacking Tutorial by Zempirians](https://www.reddit.com/r/HowToHack/new/) | HTTP Error 403: Blocked |
| [Security Intelligence - Cybersecurity Analysis & Insight](https://securityintelligence.com/) | TLS/certificate failure |
| [Penetration Testing and CyberSecurity Solution - SecureLayer7 -](https://blog.securelayer7.net/) | TLS/certificate failure |
| [Information Security](https://www.reddit.com/r/Information_Security/) | HTTP Error 403: Blocked |
| [Radware Blog – The Radware Blog shares vital knowledge with IT decision makers on application delivery, virtualization/cloud, security and specialized service provider needs.](https://www.radware.com/blog/) | Only a loader page is exposed. |
| [Cybersecurity, Research and Intelligence Blog /  Secureworks](https://www.secureworks.com/blog) | Request timed out |
| [SecurityWeek](https://www.securityweek.com/) | HTTP Error 403: Forbidden |
| [Mr. Robot /  hackers-arise](https://www.hackers-arise.com/mr-robot) | HTTP Error 403: Forbidden |
| [Pentester Academy Courses](https://www.pentesteracademy.com/topics) | No usable public content |
| [r/hacking CTF Index](https://old.reddit.com/r/hacking/wiki/index#wiki_ctfs) | HTTP Error 403: Blocked |
| [Practical Security Analytics – Cyber Security and Data Analytics](https://practicalsecurityanalytics.com/) | TLS/certificate failure |
| [0x41.cf · InfoSec, Reversing, and more](https://0x41.cf/) | Domain could not be resolved |
| [OSCP Preparation Notes](https://oscpnotes.infosecsanyam.in/My_OSCP_Preparation_Notes.html) | TLS/certificate failure |
| [ThreatMiner](https://www.threatminer.org/) | HTTP Error 522: <none> |
| [Internals - Red Teaming Experiments](https://www.ired.team/miscellaneous-reversing-forensics/windows-kernel-internals) | TLS/certificate failure |
| [picoCTF](https://picoctf.com/) | TLS/certificate failure |
| [flAWS](https://flaws.cloud/) | TLS/certificate failure |
| [flAWS2.cloud](https://flaws2.cloud/) | TLS/certificate failure |
| [Root Me](https://www.root-me.org/?lang=en) | Anti-bot challenge; no usable public content. |
| [WeChall](https://www.wechall.net/) | Anti-bot challenge; no usable public content. |
| [Hacking-Lab CTF](https://www.hacking-lab-ctf.com/) | Domain could not be resolved |
| [io.netgarage.org](https://io.netgarage.org/) | TLS/certificate failure |
| [CTF365 - Capture The Flag /  Security Training Platform](https://ctf365.com/) | TLS/certificate failure |
| [CTFlearn](https://ctflearn.com/) | HTTP Error 502: Bad Gateway |
| [Backdoor - Security platform](https://backdoor.sdslabs.co/) | Domain could not be resolved |
| [SmashTheStack Wargaming Network](https://smashthestack.org/wargames.html) | HTTP Error 404: Not Found |
| [Hacker Test: A site to test and learn about web hacking](https://www.hackertest.net/) | TLS/certificate failure |
| [Practice CTF List](https://captf.com/practice-ctf/) | Domain could not be resolved |
| [All InfoSec News](https://allinfosecnews.com/) | Domain could not be resolved |
| [Cybersecurity Books and Resources](https://community.turgensec.com/cyber-security-books/#Zero_Day_Exploits_Books) | TLS/certificate failure |
| [FuzzySecurity /  Home](https://www.fuzzysecurity.com/) | TLS/certificate failure |
| [Phrack](https://www.phrack.org/) | TLS/certificate failure |
| [BugMeNot](https://bugmenot.com/) | HTTP Error 403: Forbidden |
| [KernelMode.info](https://www.kernelmode.info/forum/) | TLS/certificate failure |
| [RE for Beginners](https://www.begin.re/) | TLS/certificate failure |
| [Binary Exploitation – areyou1or0](https://areyou1or0.it/) | TLS/certificate failure |
| [Geografija](https://g.nepo.lt/) | TLS/certificate failure |
| [Epic Games Store](https://store.epicgames.com/en-US/) | HTTP Error 403: Forbidden |
| [Fandom](https://fandom.com/) | HTTP Error 403: Forbidden |
| [NinjaJobs](https://ninjajobs.org/) | HTTP Error 403: Forbidden |
| [Upwork](https://www.upwork.com/) | HTTP Error 403: Forbidden |
| [Motointegrator](https://motointegrator.com/lt/lt/) | HTTP Error 403: Forbidden |
| [Automobile-Catalog](https://www.automobile-catalog.com/) | HTTP Error 403: Forbidden |
| [AutoEvolution Cars](https://www.autoevolution.com/cars/) | HTTP Error 403: Forbidden |
| [Amazon Your Books](https://www.amazon.com/your-books) | Generic account page shell; private book list not inspected. |
| [Roppers Academy](https://academy.hoppersroppers.org/login/index.php) | TLS/certificate failure |
| [Olaf Hartong](https://medium.com/@olafhartong) | HTTP Error 403: Forbidden |
| [BoardGameGeek](https://boardgamegeek.com/) | HTTP Error 403: Forbidden |
| [Anton Chuvakin on Medium](https://medium.com/@anton.chuvakin) | HTTP Error 403: Forbidden |
| [Detect FYI](https://detect.fyi/) | HTTP Error 403: Forbidden |
| [Anton on Security](https://medium.com/anton-on-security) | HTTP Error 403: Forbidden |

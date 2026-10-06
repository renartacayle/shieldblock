import json

# Comprehensive list of ad, tracking, and popup domains
ad_domains = [
    # Google Ads & Analytics Tracking
    "doubleclick.net",
    "googlesyndication.com",
    "googleadservices.com",
    "pagead2.googlesyndication.com",
    "adservice.google.com",
    "google-analytics.com",
    
    # Intrusive Ads, Popups & Push networks
    "popads.net",
    "popcash.net",
    "propellerads.com",
    "adsterra.com",
    "exoclick.com",
    "juicyads.com",
    "trafficjunky.net",
    "trafficfactory.biz",
    "hilltopads.com",
    "clickadu.com",
    "adcash.com",
    "adsupply.com",
    "yllix.com",
    "monetag.com",
    "ad-maven.com",
    "richpush.co",
    "evadav.com",
    "rollerads.com",
    "clickaine.com",
    "plugrush.com",
    "ero-advertising.com",
    
    # Native Ad Networks (Clickbait / Recommendation widgets)
    "taboola.com",
    "outbrain.com",
    "mgid.com",
    "revcontent.com",
    "adblade.com",
    "content.ad",
    "zergnet.com",
    "engageya.com",
    "dianomi.com",
    "plista.com",
    
    # Major Programmatic / DSP / SSP Ad Exchanges
    "adnxs.com",
    "criteo.com",
    "criteo.net",
    "rubiconproject.com",
    "pubmatic.com",
    "openx.net",
    "casalemedia.com",
    "indexww.com",
    "smartadserver.com",
    "bidswitch.net",
    "advertising.com",
    "scorecardresearch.com",
    "quantserve.com",
    "adroll.com",
    "moatads.com",
    "inmobi.com",
    "applovin.com",
    "unityads.unity3d.com",
    "chartboost.com",
    "vungle.com",
    "ironsrc.com",
    "adcolony.com",
    "fyber.com",
    "admob.com",
    "flurry.com",
    "buysellads.com",
    "carbonads.net",
    "zedo.com",
    "adform.net",
    "sovrn.com",
    "lijit.com",
    "teads.tv",
    "exponential.com",
    "tribalfusion.com",
    "media.net",
    "amazon-adsystem.com",
    "flashtalking.com",
    "yieldmo.com",
    "sharethrough.com",
    "gumgum.com",
    "undertone.com",
    "kargo.com",
    "triplelift.com",
    "contextweb.com",
    "districtm.io",
    "sonobi.com",
    "nativo.com",
    "seedtag.com",
    "admanmedia.com",
    "richaudience.com",
    "smartclip.net",
    "smaato.net",
    "tapjoy.com",
    "cdn.adpushup.com",
    "adition.com",
    "adtech.de",
    "adtechus.com",
    "conversantmedia.com",
    "liveintent.com",
    "yieldlove.com",
    "yieldlab.net",
    "adbutler.com",
    "chitika.com",
    "infolinks.com",
    "bidvertiser.com",
    "matomy.com",
    "adcovery.com",
    "spotxchange.com",
    "tremorhub.com",
    "unrulymedia.com",
    "connatix.com",
    "aniview.com",
    "primis.tech",
    "brid.tv"
]

resource_types = [
    "main_frame",
    "sub_frame",
    "stylesheet",
    "script",
    "image",
    "font",
    "object",
    "xmlhttprequest",
    "ping",
    "media",
    "websocket",
    "other"
]

# Exclude youtube.com from network-level DNR aborts so YouTube's video player won't trigger anti-adblock black screens.
# YouTube ads are handled smoothly via cosmetic filtering and auto-skipper in content scripts.
excluded_initiators = ["youtube.com"]

rules = []
rule_id = 1

for domain in ad_domains:
    rules.append({
        "id": rule_id,
        "priority": 1,
        "action": { "type": "block" },
        "condition": {
            "urlFilter": f"||{domain}^",
            "resourceTypes": resource_types,
            "excludedInitiatorDomains": excluded_initiators
        }
    })
    rule_id += 1

# Additional pattern rules for generic ad paths
generic_patterns = [
    "*/pagead/js/*",
    "*/pagead/expansion_embed*",
    "*/googleads.js",
    "*/partner.ads.google.com/*",
    "*://*/adservice/*",
    "*://*/ads/advertisement.js",
    "*://*/prebid*.js"
]

for pat in generic_patterns:
    rules.append({
        "id": rule_id,
        "priority": 1,
        "action": { "type": "block" },
        "condition": {
            "urlFilter": pat,
            "resourceTypes": resource_types,
            "excludedInitiatorDomains": excluded_initiators
        }
    })
    rule_id += 1

with open("rules.json", "w", encoding="utf-8") as f:
    json.dump(rules, f, indent=2)

print(f"Generated {len(rules)} declarativeNetRequest rules with YouTube exclusion in rules.json")

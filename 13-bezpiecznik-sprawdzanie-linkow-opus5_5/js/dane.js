/* Bezpiecznik – dane: marki, listy domen, końcówki, słowa-wabiki.
   Wszystko w jednym obiekcie globalnym, bo strona działa z file:// (bez modułów ES). */
window.BZ = window.BZ || {};

(function (BZ) {
  'use strict';

  const zbior = (s) => new Set(s.trim().split(/\s+/));

  /* Krajowe i ogólne końcówki, pod którymi marka może mieć własną stronę (np. vinted.fr).
     Celowo bez .top, .xyz, .shop itp. – tam oszuści rejestrują „allegro.top”. */
  BZ.KONCOWKI_MAREK = zbior(`
    pl com eu net org de fr it es cz sk hu ro lt lv ee at ch nl be lu dk se no fi pt ie
    co.uk com.pl uk us ca com.au au jp`);

  /* Marki, pod które najczęściej podszywają się oszuści w Polsce.
     ciagi  – szukane wewnątrz adresu (po usunięciu kropek i myślników), min. 5 znaków,
     slowa  – krótkie nazwy, liczone tylko jako osobny człon adresu (dhl-paczka.com, ale nie „groups”),
     oficjalne – domeny, które naprawdę należą do marki,
     krajowe   – czy marka.<końcówka krajowa> też jest oficjalna,
     literowki – wzorce do łapania literówek (alegro, inpots). */
  BZ.MARKI = [
    { nazwa: 'InPost', glowna: 'inpost.pl', ciagi: ['inpost', 'paczkomat'], krajowe: true,
      oficjalne: ['inpost.pl', 'inpost.eu', 'inpost-group.com', 'paczkomaty.pl'], literowki: ['inpost'] },
    { nazwa: 'Allegro', glowna: 'allegro.pl', ciagi: ['allegro'], krajowe: true,
      oficjalne: ['allegro.pl', 'allegrolokalnie.pl', 'allegro.tech', 'allegrogroup.com', 'allegropay.pl', 'allegrostatic.com', 'allegroimg.com'],
      literowki: ['allegro', 'allegrolokalnie'] },
    { nazwa: 'OLX', glowna: 'olx.pl', slowa: ['olx'], ciagi: ['olxpl', 'olxdostaw', 'olxpay', 'olxdelivery'], krajowe: true,
      oficjalne: ['olx.pl', 'olx.com', 'olx.ua', 'olx.ro', 'olx.pt', 'olx.bg', 'olx.kz', 'olx.uz', 'olxgroup.com', 'olxcdn.com'] },
    { nazwa: 'Poczta Polska', glowna: 'poczta-polska.pl', ciagi: ['pocztapolska', 'pocztex', 'envelo'],
      oficjalne: ['poczta-polska.pl', 'pocztex.pl', 'envelo.pl'], literowki: ['pocztapolska', 'pocztex'] },
    { nazwa: 'DPD', glowna: 'dpd.com.pl', slowa: ['dpd'], ciagi: ['dpdpl', 'dpdpaczk', 'dpdgroup'], krajowe: true,
      oficjalne: ['dpd.com', 'dpd.pl', 'dpd.com.pl', 'dpdgroup.com', 'dpd.co.uk'] },
    { nazwa: 'DHL', glowna: 'dhl.com', slowa: ['dhl'], ciagi: ['dhlparcel', 'dhlexpress', 'dhlpl'], krajowe: true,
      oficjalne: ['dhl.com', 'dhl.pl', 'dhl.de', 'dhlparcel.pl', 'dhl24.com.pl', 'dhlparcel.nl', 'dhl.co.uk'] },
    { nazwa: 'UPS', glowna: 'ups.com', slowa: ['ups'], slabe: ['ups'], krajowe: true, oficjalne: ['ups.com'] },
    { nazwa: 'FedEx', glowna: 'fedex.com', ciagi: ['fedex'], krajowe: true, oficjalne: ['fedex.com'] },
    { nazwa: 'GLS', glowna: 'gls-group.eu', slowa: ['gls'], slabe: ['gls'], ciagi: ['glspoland', 'glsgroup', 'glspaczk'],
      oficjalne: ['gls-group.eu', 'gls-group.com', 'gls-poland.com', 'gls-pakete.de'] },
    { nazwa: 'PKO Bank Polski', glowna: 'pkobp.pl', slowa: ['pko'], ciagi: ['pkobp', 'ipko', 'pkobank'],
      oficjalne: ['pkobp.pl', 'ipko.pl', 'pko.pl', 'pkotfi.pl', 'pkoleasing.pl'], literowki: ['pkobp'] },
    { nazwa: 'mBank', glowna: 'mbank.pl', ciagi: ['mbank'], krajowe: true, oficjalne: ['mbank.pl', 'mbank.cz', 'mbank.sk', 'mbank.com.pl'] },
    { nazwa: 'ING', glowna: 'ing.pl', slowa: ['ing'], ciagi: ['ingbank', 'ingbs', 'ingonline'], krajowe: true,
      oficjalne: ['ing.pl', 'ing.com', 'ingbank.pl', 'ing.de', 'ing.nl', 'ing.be'] },
    { nazwa: 'Santander', glowna: 'santander.pl', ciagi: ['santander'], krajowe: true,
      oficjalne: ['santander.pl', 'santander.com', 'santanderconsumer.pl', 'santander.co.uk', 'santander.de'], literowki: ['santander'] },
    { nazwa: 'Bank Pekao', glowna: 'pekao.com.pl', ciagi: ['pekao'], oficjalne: ['pekao.com.pl', 'pekaobiznes24.pl', 'pekao24.pl', 'pekaotfi.pl'] },
    { nazwa: 'Bank Millennium', glowna: 'bankmillennium.pl', ciagi: ['bankmillennium', 'millenet'],
      oficjalne: ['bankmillennium.pl', 'millenet.pl'], literowki: ['bankmillennium'] },
    { nazwa: 'Alior Bank', glowna: 'aliorbank.pl', ciagi: ['aliorbank', 'aliorbiz'], oficjalne: ['aliorbank.pl'], literowki: ['aliorbank'] },
    { nazwa: 'Credit Agricole', glowna: 'credit-agricole.pl', ciagi: ['creditagricole'], krajowe: true,
      oficjalne: ['credit-agricole.pl', 'credit-agricole.com', 'credit-agricole.fr'], literowki: ['creditagricole'] },
    { nazwa: 'BNP Paribas', glowna: 'bnpparibas.pl', ciagi: ['bnpparibas', 'goonline'], krajowe: true, oficjalne: ['bnpparibas.pl', 'bnpparibas.com'] },
    { nazwa: 'VeloBank', glowna: 'velobank.pl', ciagi: ['velobank'], oficjalne: ['velobank.pl'] },
    { nazwa: 'Revolut', glowna: 'revolut.com', ciagi: ['revolut'], oficjalne: ['revolut.com', 'revolut.me', 'revolut.codes'], literowki: ['revolut'] },
    { nazwa: 'PayPal', glowna: 'paypal.com', ciagi: ['paypal'], krajowe: true,
      oficjalne: ['paypal.com', 'paypal.me', 'paypalobjects.com', 'paypal-community.com'], literowki: ['paypal'] },
    { nazwa: 'BLIK', glowna: 'blik.com', slowa: ['blik'], ciagi: ['blikkod', 'kodblik', 'blikpay', 'blikplat'], oficjalne: ['blik.com'] },
    { nazwa: 'Przelewy24', glowna: 'przelewy24.pl', ciagi: ['przelewy24', 'przelewy'], oficjalne: ['przelewy24.pl'], literowki: ['przelewy24'] },
    { nazwa: 'PayU', glowna: 'payu.pl', slowa: ['payu'], krajowe: true, oficjalne: ['payu.pl', 'payu.com', 'secure.payu.com'] },
    { nazwa: 'mObywatel / gov.pl', glowna: 'gov.pl', slowa: ['gov', 'zus', 'epuap', 'mobywatel'], ciagi: ['mobywatel', 'epuap', 'govpl', 'ezus'],
      gov: true, oficjalne: ['gov.pl', 'zus.pl', 'podatki.gov.pl', 'mobywatel.gov.pl'], literowki: ['mobywatel'] },
    { nazwa: 'Vinted', glowna: 'vinted.pl', ciagi: ['vinted'], krajowe: true, oficjalne: ['vinted.pl', 'vinted.com', 'vinted.net'] },
    { nazwa: 'Otomoto', glowna: 'otomoto.pl', ciagi: ['otomoto'], oficjalne: ['otomoto.pl'], literowki: ['otomoto'] },
    { nazwa: 'Orlen', glowna: 'orlen.pl', ciagi: ['orlen'], krajowe: true, oficjalne: ['orlen.pl', 'orlen.com', 'orlenpaczka.pl', 'orlenoil.pl'] },
    { nazwa: 'PGE', glowna: 'pge.pl', slowa: ['pge'], ciagi: ['pgeobrot', 'pgeenergia'], oficjalne: ['pge.pl', 'gkpge.pl', 'pge-obrot.pl'] },
    { nazwa: 'Tauron', glowna: 'tauron.pl', ciagi: ['tauron'], oficjalne: ['tauron.pl', 'tauron-dystrybucja.pl'], literowki: ['tauron'] },
    { nazwa: 'Energa', glowna: 'energa.pl', ciagi: ['energa'], oficjalne: ['energa.pl', 'energa-obrot.pl', 'energa-operator.pl', 'grupa.energa.pl'] },
    { nazwa: 'Enea', glowna: 'enea.pl', slowa: ['enea'], slabe: ['enea'], oficjalne: ['enea.pl', 'eneaoperator.pl'] },
    { nazwa: 'PGNiG', glowna: 'pgnig.pl', ciagi: ['pgnig'], oficjalne: ['pgnig.pl', 'pgnigos.pl'] },
    { nazwa: 'Biedronka', glowna: 'biedronka.pl', ciagi: ['biedronka'], oficjalne: ['biedronka.pl', 'jeronimomartins.pl'], literowki: ['biedronka'] },
    { nazwa: 'Lidl', glowna: 'lidl.pl', ciagi: ['lidlpl', 'lidlplus'], slowa: ['lidl'], krajowe: true, oficjalne: ['lidl.pl', 'lidl.com', 'lidl.de', 'lidlplus.com'] },
    { nazwa: 'Netflix', glowna: 'netflix.com', ciagi: ['netflix'], krajowe: true, oficjalne: ['netflix.com', 'netflix.net', 'nflxext.com', 'nflxvideo.net'], literowki: ['netflix'] },
    { nazwa: 'Apple', glowna: 'apple.com', slowa: ['apple', 'icloud'], slabe: ['apple'], ciagi: ['appleid', 'icloud', 'appleservice', 'applesupport'], krajowe: true,
      oficjalne: ['apple.com', 'icloud.com', 'apple.news', 'mzstatic.com', 'cdn-apple.com', 'icloud-content.com', 'apple.co'] },
    { nazwa: 'Microsoft', glowna: 'microsoft.com', slabe: ['outlook'], ciagi: ['microsoft', 'office365', 'outlook', 'hotmail', 'onedrive', 'sharepoint'], krajowe: true,
      oficjalne: ['microsoft.com', 'microsoftonline.com', 'office.com', 'office365.com', 'live.com', 'outlook.com', 'hotmail.com', 'onedrive.com',
        'sharepoint.com', 'windows.net', 'msn.com', 'bing.com', 'azure.com', 'xbox.com', 'skype.com', 'msauth.net', 'msftauth.net', 'office.net', '1drv.ms', 'microsoft365.com'],
      literowki: ['microsoft'] },
    { nazwa: 'Google', glowna: 'google.com', ciagi: ['google', 'gmail'], krajowe: true,
      oficjalne: ['google.com', 'google.pl', 'gmail.com', 'googleapis.com', 'googleusercontent.com', 'gstatic.com', 'youtube.com', 'youtu.be',
        'googlemail.com', 'googlevideo.com', 'withgoogle.com', 'googleblog.com', 'blogger.com', 'appspot.com', 'web.app', 'firebaseapp.com',
        'google.co.uk', 'goo.gl', 'g.co', 'forms.gle', 'googletagmanager.com', 'google-analytics.com', 'doubleclick.net', 'android.com', 'chrome.com'],
      literowki: ['google'] },
    { nazwa: 'Facebook / Meta', glowna: 'facebook.com', ciagi: ['facebook', 'instagram', 'whatsapp', 'messenger'],
      oficjalne: ['facebook.com', 'fb.com', 'fb.me', 'fbcdn.net', 'instagram.com', 'cdninstagram.com', 'whatsapp.com', 'whatsapp.net', 'wa.me',
        'messenger.com', 'meta.com', 'facebook.net', 'threads.net', 'metastatus.com', 'oculus.com'],
      literowki: ['facebook', 'instagram', 'whatsapp'] },
    { nazwa: 'Amazon', glowna: 'amazon.pl', ciagi: ['amazon'], krajowe: true,
      oficjalne: ['amazon.pl', 'amazon.com', 'amazon.de', 'amazon.co.uk', 'amazonaws.com', 'media-amazon.com', 'amazon.jobs', 'primevideo.com', 'aws.amazon.com', 'ssl-images-amazon.com'],
      literowki: ['amazon'] },
    { nazwa: 'Steam', glowna: 'steampowered.com', ciagi: ['steamcommunity', 'steampowered'],
      oficjalne: ['steamcommunity.com', 'steampowered.com', 'steamstatic.com', 'steamusercontent.com'], literowki: ['steamcommunity', 'steampowered'] },
    { nazwa: 'Binance', glowna: 'binance.com', ciagi: ['binance'], oficjalne: ['binance.com', 'binance.info', 'bnbstatic.com'], literowki: ['binance'] },
    { nazwa: 'Coinbase', glowna: 'coinbase.com', ciagi: ['coinbase'], oficjalne: ['coinbase.com'], literowki: ['coinbase'] },
    { nazwa: 'MetaMask', glowna: 'metamask.io', ciagi: ['metamask'], oficjalne: ['metamask.io'], literowki: ['metamask'] },
    { nazwa: 'Booking.com', glowna: 'booking.com', ciagi: ['bookingcom'], oficjalne: ['booking.com', 'bstatic.com'] },
    { nazwa: 'Orange', glowna: 'orange.pl', ciagi: ['orangepl', 'orangeflex'], krajowe: true, oficjalne: ['orange.pl', 'orange.com', 'orangeflex.pl'] },
    { nazwa: 'T-Mobile', glowna: 't-mobile.pl', ciagi: ['tmobile'], krajowe: true, oficjalne: ['t-mobile.pl', 't-mobile.com', 't-mobile.de', 'heyah.pl'] },
    { nazwa: 'Play', glowna: 'play.pl', ciagi: ['playpl', 'playonline'], oficjalne: ['play.pl', 'virginmobile.pl'] },
    { nazwa: 'Plus', glowna: 'plus.pl', ciagi: ['pluspl', 'plusonline', 'icmplus'], oficjalne: ['plus.pl', 'polsatbox.pl', 'polsatboxgo.pl'] }
  ];

  /* Znane, sprawdzone strony – jeśli link prowadzi do nich, wynik jest zielony (o ile żadna baza ich nie zgłasza). */
  BZ.ZAUFANE = zbior(`
    allegro.pl allegrolokalnie.pl olx.pl inpost.pl poczta-polska.pl pocztex.pl envelo.pl dpd.com.pl dpd.pl dpd.com dhl.com dhl.pl dhlparcel.pl
    ups.com fedex.com gls-group.eu gls-group.com gls-poland.com orlenpaczka.pl
    pkobp.pl ipko.pl pko.pl mbank.pl ing.pl ing.com santander.pl pekao.com.pl pekao24.pl pekaobiznes24.pl bankmillennium.pl millenet.pl
    aliorbank.pl credit-agricole.pl bnpparibas.pl velobank.pl citibank.pl citihandlowy.pl nestbank.pl bankpocztowy.pl bosbank.pl
    revolut.com paypal.com blik.com przelewy24.pl payu.pl payu.com tpay.com
    gov.pl zus.pl nfz.gov.pl biznes.gov.pl
    orlen.pl pge.pl tauron.pl energa.pl enea.pl pgnig.pl
    vinted.pl vinted.com otomoto.pl otodom.pl ceneo.pl empik.com mediaexpert.pl rtveuroagd.pl x-kom.pl morele.net euro.com.pl
    biedronka.pl lidl.pl lidl.com rossmann.pl zabka.pl pyszne.pl glovoapp.com uber.com bolt.eu allegro.cz ikea.com decathlon.pl zalando.pl
    amazon.pl amazon.com amazon.de google.com google.pl youtube.com youtu.be gmail.com facebook.com instagram.com whatsapp.com wa.me messenger.com
    linkedin.com x.com twitter.com tiktok.com pinterest.com reddit.com spotify.com netflix.com apple.com icloud.com microsoft.com live.com
    outlook.com office.com microsoftonline.com github.com wikipedia.org wikimedia.org mozilla.org booking.com airbnb.pl airbnb.com
    wp.pl onet.pl interia.pl o2.pl gazeta.pl tvn24.pl polsatnews.pl rmf24.pl radiozet.pl tvp.pl tvp.info pap.pl money.pl bankier.pl
    orange.pl play.pl plus.pl t-mobile.pl heyah.pl virginmobile.pl polsatbox.pl canalplus.com player.pl
    cert.pl nask.pl uke.gov.pl knf.gov.pl policja.pl uokik.gov.pl
    steampowered.com steamcommunity.com zoom.us teams.microsoft.com skype.com dropbox.com wetransfer.com`);

  /* Darmowe usługi, na których każdy w minutę stawia własną stronę pod subdomeną (ktos.github.io). */
  BZ.DARMOWE_HOSTINGI = zbior(`
    github.io pages.dev workers.dev vercel.app netlify.app web.app firebaseapp.com herokuapp.com glitch.me 000webhostapp.com
    weebly.com weeblysite.com wixsite.com wix.com blogspot.com wordpress.com webflow.io framer.app framer.website godaddysites.com
    square.site mystrikingly.com strikingly.com carrd.co replit.app repl.co onrender.com fly.dev r2.dev azurewebsites.net appspot.com
    surge.sh ngrok-free.app ngrok.io ngrok.app trycloudflare.com translate.goog dweb.link myshopify.com notion.site canva.site
    jimdosite.com jimdo.com site123.me webnode.page webnode.pl yolasite.com tilda.ws ukit.me wixstudio.io hostingerapp.com
    s3.amazonaws.com amazonaws.com cloudfront.net blob.core.windows.net sharepoint.com my.canva.site gitbook.io
    ipfs.io pinata.cloud fleek.co b-cdn.net firebasestorage.app`);

  /* Usługi, gdzie wiele cudzych stron wisi pod jednym adresem, rozróżnionych ścieżką (sites.google.com/…). */
  BZ.WSPOLNE_ADRESY = zbior(`
    sites.google.com docs.google.com drive.google.com forms.gle storage.googleapis.com firebasestorage.googleapis.com
    script.google.com dropbox.com dl.dropboxusercontent.com 1drv.ms onedrive.live.com forms.office.com t.me telegra.ph
    linktr.ee ipfs.io github.com raw.githubusercontent.com gitlab.com bitbucket.org discord.gg discord.com cdn.discordapp.com
    wetransfer.com we.tl docs.zoho.com`);

  /* Skracacze linków – ukrywają prawdziwy adres. */
  BZ.SKRACACZE = zbior(`
    bit.ly bitly.com tinyurl.com t.co goo.gl ow.ly is.gd v.gd cutt.ly rb.gy shorturl.at tiny.cc t.ly s.id rebrand.ly buff.ly
    short.io shorte.st adf.ly bl.ink clck.ru u.to qrco.de tiny.one urlz.fr lnkd.in surl.li gg.gg shorturl.asia n9.cl 2.gp
    tny.im cli.re href.li lnk.bio short.gy shrtco.de vk.cc ln.run go2l.ink rotf.lol bom.so 1url.cz kutt.it chilp.it
    tr.im x.co yourls.org snip.ly bit.do mcaf.ee soo.gd bitl.cc smarturl.it hyperurl.co dub.sh dub.co spoo.me`);

  /* Końcówki adresów szczególnie lubiane przez oszustów (tanie lub darmowe, słabo pilnowane). */
  BZ.PODEJRZANE_KONCOWKI = zbior(`
    top xyz icu cyou sbs click buzz rest cfd bond monster quest mom lol win bid loan work men date review gq tk ml cf ga
    zip mov country stream download racing party trade accountant cricket science faith help support cam live vip
    shop online site store fun space website link pw cc su ws today life world uno beauty hair skin makeup boats autos yachts
    motorcycles homes mobi asia biz info`);

  /* Końcówki „wysokiego ryzyka” – ich obecność sama w sobie liczy się mocniej. */
  BZ.BARDZO_PODEJRZANE_KONCOWKI = zbior(`top xyz icu cyou sbs click buzz rest cfd bond monster quest mom lol gq tk ml cf ga zip mov su`);

  /* Słowa-wabiki: pilność, pieniądze, paczki, logowanie. Szukane w adresie po usunięciu polskich znaków. */
  BZ.WABIKI = [
    ['doplat', 'dopłata'], ['paczk', 'paczka'], ['przesylk', 'przesyłka'], ['odbior', 'odbiór'],
    ['zwrot', 'zwrot'], ['weryfik', 'weryfikacja'], ['verif', 'verify'], ['logowan', 'logowanie'], ['login', 'login'],
    ['signin', 'sign in'], ['secure', 'secure'], ['security', 'security'], ['konto', 'konto'], ['account', 'account'],
    ['update', 'update'], ['aktualiz', 'aktualizacja'], ['blokad', 'blokada'], ['zablok', 'zablokowane'], ['blocked', 'blocked'],
    ['suspend', 'suspended'], ['platnos', 'płatność'], ['payment', 'payment'], ['nagrod', 'nagroda'], ['prize', 'prize'],
    ['wygran', 'wygrana'], ['bonus', 'bonus'], ['potwierdz', 'potwierdź'], ['confirm', 'confirm'], ['wallet', 'wallet'],
    ['portfel', 'portfel'], ['delivery', 'delivery'], ['dostaw', 'dostawa'], ['tracking', 'tracking'], ['sledzen', 'śledzenie'],
    ['faktur', 'faktura'], ['invoice', 'invoice'], ['rozliczen', 'rozliczenie'], ['kurier', 'kurier'], ['courier', 'courier'],
    ['customs', 'customs'], ['clo-', 'cło'], ['refund', 'refund'], ['odblok', 'odblokuj'], ['airdrop', 'airdrop'],
    ['giveaway', 'giveaway'], ['kryptowalut', 'kryptowaluty'], ['inwestyc', 'inwestycja'], ['mandat', 'mandat'],
    ['zaleglos', 'zaległość'], ['wezwani', 'wezwanie'], ['odlaczen', 'odłączenie']
  ];

  /* Rozszerzenia plików, które instalują program na telefonie lub komputerze. */
  BZ.PLIKI_PROGRAMOW = ['apk', 'xapk', 'apks', 'exe', 'msi', 'scr', 'bat', 'cmd', 'vbs', 'ps1', 'jar', 'dmg', 'pkg', 'iso', 'img', 'hta', 'lnk', 'appx', 'msix', 'ipa', 'mobileconfig'];

  /* Domeny drugiego poziomu traktowane jak końcówka (adres.com.pl → właścicielem jest „adres.com.pl”). */
  BZ.SUFIKSY2 = zbior(`
    com.pl net.pl org.pl info.pl biz.pl waw.pl edu.pl mil.pl nom.pl shop.pl sklep.pl auto.pl media.pl priv.pl
    krakow.pl gda.pl gdansk.pl poznan.pl wroc.pl wroclaw.pl lodz.pl szczecin.pl lublin.pl bialystok.pl katowice.pl torun.pl
    co.uk org.uk ac.uk gov.uk me.uk ltd.uk plc.uk com.au net.au org.au co.jp ne.jp or.jp com.br net.br com.cn net.cn co.in
    co.za com.tr com.ua co.nz com.mx com.ar com.ru co.il com.sg com.my co.id my.id biz.id web.id com.vn com.ph com.tw
    co.kr com.hk com.co com.pe com.ng com.pk com.bd com.eg com.sa co.ke ac.id sch.id or.id`);

  /* Prawdziwe końcówki domen – do wyłapywania adresów z całej wklejonej wiadomości (bez http://).
     Wszystkie 2-literowe kody krajów są akceptowane osobno. */
  BZ.KONCOWKI_OGOLNE = zbior(`
    com net org info biz name pro edu gov int mil eu asia mobi tel travel jobs cat aero coop museum
    top xyz icu cyou sbs click buzz rest cfd bond monster quest mom lol win bid loan work men date review zip mov country
    stream download racing party trade accountant cricket science faith help support cam live vip shop online site store fun
    space website link today life world uno beauty hair skin makeup boats autos yachts motorcycles homes app dev page io ai
    blog cloud tech digital media news email group team services solutions company agency studio design art bank money
    finance cash credit loans insurance pay delivery express parcel post market sale deals club games game bet casino poker
    shopping tickets events social chat love dating wiki one plus fit health care clinic dental doctor law legal tax
    center city land house realestate estate property rent ltd inc llc gmbh global network systems software codes zone
    tools tips guide academy school university email ovh warszawa waw krakow gdn berlin paris london nyc tokyo moscow
    amazon google apple microsoft netflix youtube gmail android chrome bing windows`);

  /* Krótkie wyrazy po kropce, które w polskich SMS-ach nie są adresami (np. „godz.12”, „ul.Kwiatowa” odpadają i tak). */
  BZ.NIE_ADRESY = zbior(`np.pl tj.pl ok.pl`);

})(window.BZ);

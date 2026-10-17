// Long-form legal content (Icelandic). DRAFTS — not reviewed by a lawyer.
// Kept separate from short UI strings; an English version can mirror this shape.

export type LegalDoc = { updated: string; sections: { heading: string; body: string[] }[] };

export const privacyIs: LegalDoc = {
  updated: "2026-10-15",
  sections: [
    {
      heading: "Hver ber ábyrgð á vinnslunni?",
      body: ["Rekstraraðili Verkvangs er ábyrgðaraðili vinnslu persónuupplýsinga á vefnum. Nánari upplýsingar um rekstraraðila og tengilið vegna persónuverndar verða birtar hér fyrir opnun."],
    },
    {
      heading: "Hvaða upplýsingum söfnum við?",
      body: [
        "Aðgangur: nafn, netfang, lykilorð (geymt dulkóðað sem tætigildi) og valfrjálst símanúmer.",
        "Verkbeiðnir: lýsing verks, myndir, heimilisfang, póstnúmer og hentugur tími. Lýsigögn mynda (t.d. GPS-staðsetning) eru fjarlægð við upphleðslu.",
        "Fagaðilar: upplýsingar um fyrirtæki, kennitala fyrirtækis (valfrjáls), þjónustusvæði og upplýsingar um réttindi.",
        "Notkun: innskráningarlotur og atvikaskrá yfir aðgerðir sem varða öryggi og bókhald.",
      ],
    },
    {
      heading: "Til hvers notum við upplýsingarnar?",
      body: [
        "Til að tengja viðskiptavini og fagaðila, halda utan um verkbeiðnir og bókanir, senda tilkynningar, tryggja öryggi og uppfylla lagaskyldur, t.d. um bókhald.",
        "Við seljum ekki persónuupplýsingar og notum þær ekki til auglýsinga.",
      ],
    },
    {
      heading: "Hverjir sjá upplýsingarnar?",
      body: [
        "Fagaðilar sem þú sendir verkbeiðni sjá lýsingu, myndir, sveitarfélag, póstnúmer og fornafn þitt. Nákvæmt heimilisfang, fullt nafn, símanúmer og netfang sjást aðeins hjá þeim fagaðila sem þú bókar.",
        "Starfsfólk Verkvangs hefur aðgang að upplýsingum eftir því sem þörf krefur vegna yfirferðar, þjónustu og ágreiningsmála.",
      ],
    },
    {
      heading: "Hversu lengi geymum við upplýsingarnar?",
      body: ["Á meðan aðgangur er virkur. Þegar aðgangi er eytt fjarlægjum við persónuupplýsingar; upplýsingar um lokin verk og gjöld eru geymdar án persónuauðkenna eins lengi og bókhaldslög krefjast."],
    },
    {
      heading: "Réttindi þín",
      body: [
        "Þú átt rétt á aðgangi að upplýsingum um þig, leiðréttingu og eyðingu. Þú getur breytt upplýsingum og eytt aðgangi á Mínum síðum.",
        "Þú getur kvartað til Persónuverndar (personuvernd.is) ef þú telur vinnsluna ekki samrýmast lögum nr. 90/2018.",
      ],
    },
  ],
};

export const termsIs: LegalDoc = {
  updated: "2026-10-15",
  sections: [
    {
      heading: "Um þjónustuna",
      body: [
        "Verkvangur er markaðstorg sem tengir viðskiptavini og sjálfstætt starfandi fagaðila. Samningur um verk er gerður beint á milli viðskiptavinar og fagaðila; Verkvangur er ekki aðili að honum.",
      ],
    },
    {
      heading: "Fyrir viðskiptavini",
      body: ["Það kostar ekkert að leita, senda verkbeiðni eða bóka. Engin bókunargjöld eru lögð á viðskiptavini.", "Verð koma frá fagaðilum og þeim fylgir alltaf tegund verðs: fast verð, áætlað verð, tímagjald eða verð eftir skoðun."],
    },
    {
      heading: "Fyrir fagaðila",
      body: [
        "Skráning er ókeypis. Fagaðilar ráða eigin verði og velja sjálfir hvaða verk þeir taka að sér.",
        "Á Grunnleið er tekið fast þjónustugjald fyrir hvert verk sem kemur í gegnum Verkvang og lýkur með staðfestingu viðskiptavinar. Ekkert gjald er tekið fyrir hafnaðar beiðnir, bókanir sem hætt er við eða eigin viðskiptavini. Engin prósentuþóknun er tekin og aldrei af efniskostnaði.",
        "Merki um réttindi birtast aðeins þegar Verkvangur hefur staðfest þau. Röðun í leit er óháð áskriftarleið.",
      ],
    },
    {
      heading: "Ágreiningur",
      body: ["Ef aðilar eru ósammála um hvort verki sé lokið geta þeir gert athugasemd. Starfsfólk Verkvangs fer yfir málið með báðum aðilum og skráir niðurstöðu."],
    },
  ],
};

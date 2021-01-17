export interface Article {
  /**
   * Stikktittel
   */
  introTitle?: string;

  /**
   * Vis publiseringsdato
   */
  showPublishDate: boolean;

  /**
   * Vis tidspunkt for sist redigering
   */
  showModifiedDate?: {
    /**
     * Selected
     */
    _selected: string | Array<string>;

    /**
     * Skal det vises dato?
     */
    dateOption?: {
      /**
       * Vis klokkeslett for publisering
       */
      showModifiedTime: boolean;

      /**
       * Tidspunkt for endring
       */
      modifiedDate?: string;
    };
  };

  /**
   * Løpenummer
   */
  serialNumber?: string;

  /**
   * Forfatter
   */
  authorItemSet?: Array<{
    /**
     * Navn
     */
    name?: string;

    /**
     * E-post
     */
    email?: string;
  }>;

  /**
   * Ingress
   */
  ingress?: string;

  /**
   * Artikkeltekst
   */
  articleText?: string;

  /**
   * Tilhørende statistikk
   */
  associatedStatistics?: {
    /**
     * Selected
     */
    _selected: string;

    /**
     * Lenke til tilhørende statistikk (XP)
     */
    XP?: {
      /**
       * Statistikk
       */
      content?: string;
    };

    /**
     * Lenke til tilhørende statistikk (4.7.)
     */
    CMS?: {
      /**
       * URL
       */
      href?: string;

      /**
       * Tittel
       */
      title?: string;
    };
  };

  /**
   * Arkiv
   */
  articleArchive?: Array<string>;

  /**
   * Relatert statistikk
   */
  relatedStatisticsOptions?: {
    /**
     * Selected
     */
    _selected: string;

    /**
     * Statistikk fra XP
     */
    xp?: {
      /**
       * Statistikk
       */
      contentId?: Array<string>;
    };

    /**
     * Statistikk fra 4.7
     */
    cms?: {
      /**
       * Tittel
       */
      title: string;

      /**
       * Profileringstekst
       */
      profiledText: string;

      /**
       * URL
       */
      url: string;
    };
  };

  /**
   * Relaterte eksterne lenker
   */
  relatedExternalLinkItemSet?: Array<{
    /**
     * Lenketekst
     */
    urlText: string;

    /**
     * URL
     */
    url: string;
  }>;

  /**
   * Relatert artikkel
   */
  relatedArticles?: {
    /**
     * Selected
     */
    _selected: string;

    /**
     * Artikkel
     */
    article?: {
      /**
       * Artikkel
       */
      article: string;
    };

    /**
     * Artikkel fra CMS
     */
    externalArticle?: {
      /**
       * URL
       */
      url: string;

      /**
       * Tittel
       */
      title: string;

      /**
       * Type
       */
      type?: string;

      /**
       * Dato
       */
      date?: string;

      /**
       * Ingress
       */
      preface: string;

      /**
       * Bilde
       */
      image: string;
    };
  };

  /**
   * Faktasider
   */
  relatedFactPages?: Array<string>;

  /**
   * Kontakter
   */
  contacts?: string;
}

const scheme = {
  "0": {
    songSchema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        albumId: 'string',
        artistId: 'string',
        displayName: 'string',
        duration: 'double',
        file: 'string',
      }
    },
    albumSchema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        displayName: 'string',
      }
    },
    artistSchema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        displayName: 'string',
      }
    },
    playlistSchema: {
      version: 0,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        owner: 'string',
        displayName: 'string',
        public: 'boolean',
        songs: {
          type: 'array',
          items: 'string',
        },
      }
    },
    authSchema: {
      version: 0,
      primaryKey: 'loginName',
      type: 'object',
      properties: {
        loginName: {type: 'string', maxLength: 16},
        displayName: 'string',
        password: 'string',
        authtoken: 'string',
      }
    },
    playedSchema: {
      version: 0,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: 'string'},
      }
    },
    favoriteSchema: {
      version: 0,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: {type: 'string'}},
      }
    }
  },
  "1": {
    songSchema: {
      version: 1,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        albumId: 'string',
        artistId: 'string',
        displayName: 'string',
        albumDisplayName: 'string',
        artistDisplayName: 'string',
        duration: 'double',
        file: 'string',
        added: 'int',
      }
    },
    albumSchema: {
      version: 1,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        artistId: 'string',
        displayName: 'string',
        artistDisplayName: 'string',
        songCount: 'int',
        added: 'int',
      }
    },
    artistSchema: {
      version: 1,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        displayName: 'string',
        albumCount: 'int',
        songCount: 'int',
      }
    },
    playlistSchema: {
      version: 1,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        owner: 'string',
        displayName: 'string',
        public: 'boolean',
        songs: {
          type: 'array',
          items: 'string',
        },
        songCount: 'int',
        added: 'int',
      }
    },
    authSchema: {
      version: 1,
      primaryKey: 'loginName',
      type: 'object',
      properties: {
        loginName: {type: 'string', maxLength: 16},
        displayName: 'string',
        password: 'string',
        authtoken: 'string',
      }
    },
    playedSchema: {
      version: 1,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: 'string'},
      }
    },
    favoriteSchema: {
      version: 1,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: {type: 'string'}},
        count: 'int',
      }
    }
  },
  "2": {
    songSchema: {
      version: 2,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        albumId: 'string',
        artistId: 'string',
        displayName: 'string',
        albumDisplayName: 'string',
        artistDisplayName: 'string',
        duration: 'double',
        youtubeId: 'string',
        added: 'int',
      }
    },
    albumSchema: {
      version: 2,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        artistId: 'string',
        displayName: 'string',
        artistDisplayName: 'string',
        songCount: 'int',
        added: 'int',
      }
    },
    artistSchema: {
      version: 2,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        displayName: 'string',
        albumCount: 'int',
        songCount: 'int',
      }
    },
    playlistSchema: {
      version: 2,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        owner: 'string',
        displayName: 'string',
        public: 'boolean',
        songs: {
          type: 'array',
          items: 'string',
        },
        songCount: 'int',
        added: 'int',
      }
    },
    authSchema: {
      version: 2,
      primaryKey: 'loginName',
      type: 'object',
      properties: {
        loginName: {type: 'string', maxLength: 16},
        displayName: 'string',
        password: 'string',
        authtoken: 'string',
      }
    },
    playedSchema: {
      version: 2,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: 'string'},
      }
    },
    favoriteSchema: {
      version: 2,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: {type: 'string'}},
        count: 'int',
      }
    }
  },
  "3": {
    songSchema: {
      version: 3,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        albumId: 'string',
        artistId: 'string',
        displayName: 'string',
        albumDisplayName: 'string',
        artistDisplayName: 'string',
        duration: 'double',
        youtubeId: 'string',
        imageUrl: 'string',
        added: 'int',
      }
    },
    albumSchema: {
      version: 3,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        artistId: 'string',
        displayName: 'string',
        artistDisplayName: 'string',
        songCount: 'int',
        imageUrl: 'string',
        added: 'int',
      }
    },
    artistSchema: {
      version: 3,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        displayName: 'string',
        albumCount: 'int',
        songCount: 'int',
        imageUrl: 'string',
        added: 'int',
      }
    },
    playlistSchema: {
      version: 3,
      primaryKey: 'id',
      type: 'object',
      properties: {
        id: {type: 'string', maxLength: 256},
        owner: 'string',
        displayName: 'string',
        public: 'boolean',
        songs: {
          type: 'array',
          items: 'string',
        },
        songCount: 'int',
        added: 'int',
      }
    },
    authSchema: {
      version: 3,
      primaryKey: 'loginName',
      type: 'object',
      properties: {
        loginName: {type: 'string', maxLength: 16},
        displayName: 'string',
        password: 'string',
        authtoken: 'string',
      }
    },
    playedSchema: {
      version: 3,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: 'string'},
      }
    },
    favoriteSchema: {
      version: 3,
      primaryKey: 'owner',
      type: 'object',
      properties: {
        owner: {type: 'string', maxLength: 16},
        songs: {type: 'array', items: {type: 'string'}},
        count: 'int',
      }
    }
  }
}

export default {
  // version: version,
  // songSchema: songSchema,
  // albumSchema: albumSchema,
  // artistSchema: artistSchema,
  // playlistSchema: playlistSchema,
  // authSchema: authSchema,
  // playedSchema: playedSchema,
  // favoriteSchema: favoriteSchema,
  register: (db, version) => {
    if(typeof version == 'undefined'){
      console.log('version is not defined:',version);
      return Promise.reject('version is not defined');
    }
    var scam = scheme[version.toString()];
    if(!db){
      return Promise.reject('db is not defined');
    }
    return db.addCollections({
      songs: {
        migrationStrategies:{
          1: (doc) => {
            doc.albumDisplayName = "IGOTTAFIXTHISASAP";
            doc.artistDisplayName = "IGOTTAFIXTHISASAP";
            doc.added = Date.now();
            return doc;
          },
          2: (doc) => {
            doc.youtubeId = 'SHRUG';
            return doc;
          },
          3: (doc) => {
            doc.imageUrl = 'https://cdn4.iconfinder.com/data/icons/ios7-inspired-mac-icon-set/512/AppleMusic.png';
            return doc;
          }
        },
        schema: scam.songSchema
      },
      albums: {
        migrationStrategies:{
          1: (doc) => {
            doc.artistDisplayName = "IGOTTAFIXTHISASAP";
            doc.songCount = 0;
            doc.added = Date.now();
            return doc;
          },
          2: (doc) => doc,
          3: (doc) => {
            doc.imageUrl = 'https://cdn4.iconfinder.com/data/icons/ios7-inspired-mac-icon-set/512/AppleMusic.png';
            return doc;
          }
        },
        schema: scam.albumSchema
      },
      artists: {
        migrationStrategies:{
          1: (doc) => {
            doc.albumCount = 0;
            doc.songCount = 0;
            doc.added = Date.now();
            return doc;
          },
          2: (doc) => doc,
          3: (doc) => {
            doc.imageUrl = 'https://cdn4.iconfinder.com/data/icons/ios7-inspired-mac-icon-set/512/AppleMusic.png';
            doc.added = Date.now();
            return doc;
          }
        },
        schema: scam.artistSchema,
      },
      playlists: {
        migrationStrategies:{
          1: (doc) => {
            // doc.songCount = 0;
            doc.songCount = doc.songs.length;
            doc.added = Date.now();
            return doc;
          },
          2: (doc) => doc,
          3: (doc) => doc,
        },
        schema: scam.playlistSchema,
      },
      auth: {
        migrationStrategies:{
          1: (doc) => doc,
          2: (doc) => doc,
          3: (doc) => doc,
        },
        schema: scam.authSchema,
      },
      played: {
        migrationStrategies:{
          1: (doc) => doc,
          2: (doc) => doc,
          3: (doc) => doc,
        },
        schema: scam.playedSchema,
      },
      favorites: {
        migrationStrategies: {
          1: (doc) => {
            // doc.count = 0;
            doc.count = doc.songs.length;
            return doc;
          },
          2: (doc) => doc,
          3: (doc) => doc,
        },
        schema: scam.favoriteSchema
      }
    });
  },

  typesenseCollections: [
    {
      "name": "taxi-songs",
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "albumId", "type": "string"},
        {"name": "artistId", "type": "string"},
        {"name": "displayName", "type": "string", "facet": true},
        {"name": "albumDisplayName", "type": "string", "facet": true},
        {"name": "artistDisplayName", "type": "string", "facet": true},
        {"name": "duration", "type": "float"},
        {"name": "youtubeId", "type": "string"},
        {"name": "imageUrl", "type": "string"},
        {"name": "added", "type": "int32", "facet": true},
      ],
      "default_sorting_field": "added",
      "default_sorting_order": "desc",
    },
    {
      "name": "taxi-albums",
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "artistId", "type": "string"},
        {"name": "displayName", "type": "string", "facet": true},
        {"name": "artistDisplayName", "type": "string", "facet": true},
        {"name": "songCount", "type": "int32"},
        {"name": "imageUrl", "type": "string"},
        {"name": "added", "type": "int32", "facet": true},
      ],
      "default_sorting_field": "added",
      "default_sorting_order": "desc",
    },
    {
      "name": "taxi-artists",
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "displayName", "type": "string", "facet": true},
        {"name": "albumCount", "type": "int32"},
        {"name": "songCount", "type": "int32"},
        {"name": "imageUrl", "type": "string"},
        {"name": "added", "type": "int32", "facet": true},
      ],
      "default_sorting_field": "added",
      "default_sorting_order": "desc",
    },
    {
      "name": "taxi-relevance",
      "fields": [
        {"name": "id", "type": "string"},
        {"name": "displayName", "type": "string", "facet": true},
        {"name": "imageUrl", "type": "string"},
        {"name": "type", "type": "string"},
      ]
    }
  ]
}

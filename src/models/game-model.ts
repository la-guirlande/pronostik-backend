import { Document, Model, Mongoose, Schema } from 'mongoose';
const mongooseToJson = require('@meanie/mongoose-to-json');
import ServiceContainer from '../services/service-container';
import Attributes from './model';
import { UserInstance } from './user-model';

/**
 * Game attributes.
 */
export interface GameAttributes extends Attributes {
  name?: string;
  description?: string;
  players: UserInstance[];
  tracks: GameTrack[];
}

/**
 * Game track.
 */
export interface GameTrack {
  _id?: string;
  id?: string;
  name: string;
  artists: string[];
  scores?: GameTrackScore[];
  played?: boolean;
}

/**
 * Game track score.
 */
export interface GameTrackScore {
  player: UserInstance;
  score: number;
}

/**
 * Game scoreboard.
 */
export interface GameScoreboard {
  gameId: string;
  board: {
    player: UserInstance;
    score: number;
    position?: number;
  }[];
}

/**
 * Game document.
 */
export interface GameDocument extends GameAttributes, Document {
  getScoreboard(): GameScoreboard;
}

/**
 * Game model.
 */
export interface GameModel extends Model<GameDocument> {}

/**
 * Creates the game model.
 * 
 * @param container Services container
 * @param mongoose Mongoose instance
 */
export default function createModel(container: ServiceContainer, mongoose: Mongoose): GameModel {
  return mongoose.model<GameDocument, GameModel>('Game', createGameSchema(), 'games');
}

/**
 * Creates the game schema.
 * 
 * @param container Services container
 * @returns Game schema
 */
function createGameSchema() {
  const schema = new Schema<GameDocument, GameModel>({
    name: {
      type: Schema.Types.String,
      default: null
    },
    description: {
      type: Schema.Types.String,
      default: null
    },
    players: {
      type: [{
        type: Schema.Types.ObjectId,
        ref: 'User'
      }],
      validate: {
        validator: (players: UserInstance[]) => players != null && players.length >= 1,
        message: 'Game players are required'
      }
    },
    tracks: {
      type: [{
        type: createGameTrackSchema()
      }],
      default: []
    }
  }, {
    timestamps: false,
    toJSON: { virtuals: true },
    toObject: { virtuals: true }
  });

  schema.method('getScoreboard', function(this: GameDocument) {
    const scoreboard: GameScoreboard = {
      gameId: this.id,
      board: []
    };

    this.players.forEach(player => {
      let score = 0;
      this.tracks.forEach(track => {
        track.scores.filter(trackScore => trackScore.player.toString() === player.toString()).forEach(trackScore => {
          if (track.played) {
            score += trackScore.score;
          } else {
            score -= trackScore.score;
          }
        });
      })
      scoreboard.board.push({ player, score });
    });

    scoreboard.board.sort((a, b) => b.score - a.score);
    scoreboard.board.forEach((board, i) => board.position = i + 1);

    return scoreboard;
  });

  schema.plugin(mongooseToJson);

  return schema;
}

/**
 * Creates the game track subschema.
 * 
 * @param container Services container
 * @returns Game track subschema
 */
function createGameTrackSchema() {
  const schema = new Schema({
    name: {
      type: Schema.Types.String,
      required: [true, 'Game track name is required']
    },
    artists: {
      type: [{
        type: Schema.Types.String
      }],
      validate: {
        validator: (artists: string[]) => artists != null && artists.length >= 1,
        message: 'Game track artists are required'
      }
    },
    scores: {
      type: [{
        type: createGameTrackScoreSchema()
      }],
      default: []
    },
    played: {
      type: Schema.Types.Boolean,
      default: false
    }
  }, {
    timestamps: false
  });

  schema.plugin(mongooseToJson);

  return schema;
}

/**
 * Creates the game track score subschema.
 * 
 * @param container Services container
 * @returns Game track score subschema
 */
function createGameTrackScoreSchema() {
  const schema = new Schema({
    player: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: [true, 'Game track score player is required']
    },
    score: {
      type: Schema.Types.Number,
      required: [true, 'Game track score is required'],
      min: [0, 'Game track score must be between 0 and 10'],
      max: [10, 'Game track score must be between 0 and 10']
    }
  }, {
    _id: false,
    id: false,
    timestamps: false
  });
  return schema;
}

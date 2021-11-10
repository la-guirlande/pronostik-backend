import { Document, Model, Mongoose, Schema } from 'mongoose';
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
  name: string;
  artists: string[];
  scores: GameTrackScore[];
  played: boolean;
}

/**
 * Game track score.
 */
export interface GameTrackScore {
  player: UserInstance;
  score: number;
}

/**
 * Game instance.
 */
export interface GameInstance extends GameAttributes, Document {}

/**
 * Creates the game model.
 * 
 * @param container Services container
 * @param mongoose Mongoose instance
 */
export default function createModel(container: ServiceContainer, mongoose: Mongoose): Model<GameInstance> {
  return mongoose.model('Game', createGameSchema(), 'games');
}

/**
 * Creates the game schema.
 * 
 * @param container Services container
 * @returns Game schema
 */
function createGameSchema() {
  const schema = new Schema({
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
      validate: {
        validator: (scores: GameTrackScore[]) => scores != null && scores.length >= 10,
        message: 'Game track scores must be >= 10'
      }
    },
    played: {
      type: Schema.Types.Boolean,
      default: false
    }
  }, {
    timestamps: false
  });
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
    timestamps: false
  });
  return schema;
}

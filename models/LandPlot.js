const mongoose = require('mongoose');

const landPlotSchema = new mongoose.Schema({
    landCode: {
        type: String,
        unique: true,
        required: true
    },
    owner: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        required: [true, 'Owner is required']
    },
    landType: {
        type: String,
        enum: ['10005', '00050'], // 10005: Private, 00050: Public
        required: true
    },
    regionCode: {
        type: String, // 01-10
        required: true
    },
    plotNumber: {
        type: String, // Official number from Titre Foncier
        required: true
    },
    location: {
        type: String,
        required: [true, 'Location is required'],
        trim: true
      },
      price: {
        type: Number,
        required: [true, 'Price is required']
      },
      area: {
        type: Number, // in square meters
        required: [true, 'Area is required']
      },
      coordinates: {
        lat: Number,
        lng: Number
      },
      images: [{
        type: String
      }],
      coverImage: {
        type: String,
        default: 'default-plot.jpg'
      },
      matterportId: {
        type: String,
        trim: true
      },
      description: {
        type: String,
        trim: true
      },
      status: {
        type: String,
        enum: ['cleared', 'sold', 'pending', 'under_review', 'flagged', 'blocked', 'transferred', 'disputed'],
        default: 'cleared'
      },
      lastTransferDate: {
        type: Date,
        default: Date.now
      },
      titleDeedUrl: {
        type: String
      },
      ownershipHistory: [{
        owner: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'User'
        },
        acquiredDate: {
            type: Date
        },
        transferDate: {
            type: Date,
            default: Date.now
        },
        transferType: String,
        previousLandCode: String
      }]
}, {
    timestamps: true
});

const LandPlot = mongoose.model('LandPlot', landPlotSchema);
module.exports = LandPlot;

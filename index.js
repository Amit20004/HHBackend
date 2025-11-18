const express=require('express');
const app=express();
const mongoose=require('mongoose');
const cors=require('cors');
const bodyParser=require('body-parser');
const dbConnect=require("./db")
require('dotenv').config();
const path = require("path");
const port = process.env.PORT || 8000;
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use('/uploads', express.static(path.join(__dirname, '/uploads')));
app.get('/',(req,res)=>{
    res.send("hellow world");
});

//routes
app.use('/api',require('./routes/getHyundaiCarData')); //car data route
app.use('/api',require('./routes/getCarLogosRoute')); //carlogos route
app.use('/api',require('./routes/getHomeCarouselRoute')); //home carousel images route
app.use('/api',require('./routes/getCarCarouselDetailRoute')); //car carousel images route
app.use('/api',require('./routes/getHomeService')); //service images route
app.use('/api',require('./routes/getInsideAboutSectionRoute')); //about us section data  route
app.use('/api',require('./routes/getHighlightTabsDataRoute')); //acar highlight tabs data  route
app.use('/api',require('./routes/getHighlightCarGalleryRoute')); //acar highlight gallery data  route
app.use('/api',require('./routes/getInteriorRoute')); //acar highlight gallery data  route
app.use('/api',require('./routes/getCarExteriorViewRoute')); //acar exterior views data  route
app.use('/api',require('./routes/getCarExteriorGalleryRoute')); //acar exterior views data  route
app.use('/api',require('./routes/getCarPerformanceRoute')); //acar exterior views data  route
app.use('/api',require('./routes/getCarAccessoriesRoute')); //service images route
app.use('/api',require('./routes/getCarSafetySecurityRoute')); //service images route
app.use('/api',require('./routes/getCarConvenienceRoute')); //service images route
app.use('/api',require('./routes/getCarSpecificationRoute')); //service images route
// app.use('/api',require('./routes/getCarBrochuresRoute')); //service images route
app.use('/api',require('./routes/getAllCArEBrochuresRoute')); //service images route
app.use('/api',require('./routes/getCarPriceListingRoute')); //car price data route
app.use('/api',require('./routes/getCarColorChangeRoute')); //car color data route
app.use('/api',require('./routes/getCarBannerRoute')); //car color data route
app.use('/api',require('./routes/getDocumentationPageRoute')); //car color data route
app.use('/api',require('./routes/getCarOfferRoute')); //car color data route
app.use('/api',require('./routes/getCArServiceOfferRoute')); //car color data route
app.use('/api',require('./routes/getAboutUsRoute')); //car color data route
app.use('/api',require('./routes/getGalleryRoute')); //car color data route
app.use('/api',require('./routes/getTestimonialRoute')); //car color data route
app.use('/api',require('./routes/getLocationRoute')); //car color data route
app.use('/api',require('./routes/getDetailedLocationRoute')); //car color data route
app.use('/api',require('./routes/getDetailedLocationRoute')); //car color data route
app.use('/api',require('./routes/getEdiotTextDataRoute')); //car color data route
app.use('/api',require('./routes/postBookServiceFormRoute')); //car color data route
app.use('/api',require('./routes/postTestDriveFormRoute')); //car color data route
app.use('/api',require('./routes/postPickDropFormRoute')); //car color data route
app.use('/api',require('./routes/postContactUsFormRoute')); //car color data route
app.use('/api',require('./routes/postHomeTabsServicesSectionRoute')); //car color data route
app.use('/api',require('./routes/postHomeAboutSectionRoute')); //car color data route
app.use('/api',require('./routes/postHomeAboutSectionRoute2')); //car color data route
app.use('/api',require('./routes/postCarAccessoryEnquiryFormRoute')); //car color data route
app.use('/api',require('./routes/postLoanEnquiryFormDataRoute')); //car color data route
app.use('/finder',require('./routes/finder')); //car color data route
app.use('/api',require('./routes/postMetaDataRoute')); //car color data route
app.use('/api',require('./routes/postAllServicesRoute')); //car color data route
app.use('/api',require('./routes/postSideFormEnquiriesRoute')); //car color data route
app.use('/api',require('./routes/postTopNavbarRoute')); //car color data route
app.use('/api',require('./routes/postInsuranceEnquiryRoute')); //car color data route
app.use('/api',require('./routes/postFAQRoute')); //car color data route
app.use('/api',require('./routes/postRoadAssistanceRoute')); //car color data route



app.listen(port,(req,res)=>{
    console.log(`hans hyundai server running successfully on port number ${port}`)
});

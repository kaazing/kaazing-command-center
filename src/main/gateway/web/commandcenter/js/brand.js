/**
 * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.
 */

"use strict";

/** 
 * Various attributes may be set to brand the Command Center with 
 * something other than the default Kaazing look and feel (in 
 * addition to creating a LESS file to change certain CSS attributes.
 * 
 * To change the branding, add a call below this comment of the form:
 * 
 * CC.brand(config} 
 * 
 * where 'config' is an object with the ALL of the following properties
 * specified with non-empty and non-null values:
 *
 * productName: the string to use for the window title and in various
 *              messages to the user
 * companyWebsiteUrl: A string, the full URL to use with the image
 *                    shown in the Command Center's title bar (generally
 *                    a company logo). Clicking the image will take the 
 *                    user to the specified location.
 * headerLogoImageUrl: A string, the URL of an image that will be displayed
 *                     on the left side of the header bar, generally intended
 *                     for the company logo. Clicking the image will take 
 *                     the user to 'companyWebsiteUrl' in a separate window.
 *                     The image URL may be absolute or relative.
 * footerLogoImageUrl: A string, the URL of an image that will be displayed
 *                     on the left side of the footer bar. The image URL may
 *                     be absolute or relative.
 * loginLogoImageUrl:  A string, the URL of an image to display above the
 *                     Command Center title on the Login dialog.
 *                     The image URL may be absolute or relative.
 * aboutLogoImageUrl:  A string, the URL of an image to display above the
 *                     Command Center title on the About dialog.
 *                     The image URL may be absolute or relative.
 * updateLogoImageUrl: A string, the URL of an image to display above the
 *                     Command Center title on the Update dialog.
 *                     The image URL may be absolute or relative.
 * copyrightNotice:    A string, the copyright notice to display at the left
 *                     of the footer bar, just past the footer logo.
 */

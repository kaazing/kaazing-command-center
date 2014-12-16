/*
 * Copyright (c) 2007-2014 Kaazing Corporation. All rights reserved.
 * 
 * Licensed to the Apache Software Foundation (ASF) under one
 * or more contributor license agreements.  See the NOTICE file
 * distributed with this work for additional information
 * regarding copyright ownership.  The ASF licenses this file
 * to you under the Apache License, Version 2.0 (the
 * "License"); you may not use this file except in compliance
 * with the License.  You may obtain a copy of the License at
 * 
 *   http://www.apache.org/licenses/LICENSE-2.0
 * 
 * Unless required by applicable law or agreed to in writing,
 * software distributed under the License is distributed on an
 * "AS IS" BASIS, WITHOUT WARRANTIES OR CONDITIONS OF ANY
 * KIND, either express or implied.  See the License for the
 * specific language governing permissions and limitations
 * under the License.
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

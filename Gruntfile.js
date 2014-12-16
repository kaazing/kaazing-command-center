module.exports = function(grunt) {

    // Project configuration.
    grunt.initConfig({
        pkg: grunt.file.readJSON('package.json'), 

        clean: {
            dist: {
                src: ['dist/']
            },
            tmp: {
                src: ['dist/tmp']
            },
        },

	copy: {
            // copy the source files that can just go directly to dist unchanged.
	    src: {
	  	cwd: 'src/',
		src: ['css/**', 
                      'html/**', 
                      'images/**', 
                      'index.html', 
                      'js/brand.js' ],
		dest: 'dist/commandcenter',
		expand: true,
                mode: 0644
	    },
	    thirdparty: {
	  	cwd: 'src/js',
		src: ['less.js', 
                      'prefixfree.min.js', 
                      'stacktrace.js'],
		dest: 'dist/commandcenter/js',
		expand: true,
                mode: 0644
	    },
            client_js: {
                cwd: 'bower_components/kaazing-client-javascript/js',
                src: ['PostMessage*.js', 
                      'WebSocket*.js' 
                     ],
                dest: 'dist/commandcenter/js',
                expand: true,
                mode: 0644
            },
            yui: {
                cwd: 'bower_components/yui3/build',
                src: ['**/*-min.js', 
                      '**/lang/**', 
                      '**/*.css', 
                      'datatable-sort/assets/skins/sam/sort-arrow-sprite.png' 
                     ],
                dest: 'dist/commandcenter/yui',
                expand: true,
                mode: 0644
            },
            yui_gallery: {
                cwd: 'bower_components/yui3-gallery/build',
                src: ['gallery-contextmenu-view/**/*-min.js', 
                      'gallery-contextmenu-view/assets/**',
                      'gallery-datatable-selection/**/*-min.js', 
                      'gallery-datatable-selection/assets/**', 
                      'gallery-widget-inherit-css/**/*-min.js', 
                      'gallery-widget-inherit-css/assets/**'
                      ],
                dest: 'dist/commandcenter/yui-gallery',
                expand: true,
                mode: 0644
            }
	},

        // Assemble the CC concatenated and minified JS files
	concat: {
	    models: {
		src: [ 
                    'src/js/models/map_model.js',
                    'src/js/models/cluster_model.js',
                    'src/js/models/gateway_model.js',
                    'src/js/models/service_model.js',
                    'src/js/models/session_model.js',
                    'src/js/models/cluster_config_model.js',
                    'src/js/models/cpu_list_model.js',
                    'src/js/models/gateway_config_model.js',
                    'src/js/models/gateway_dynamic_data_model.js',
                    'src/js/models/jvm_model.js',
                    'src/js/models/license_config_model.js',
                    'src/js/models/licenses_config_model.js',
                    'src/js/models/list_model.js',
                    'src/js/models/network_config_model.js',
                    'src/js/models/nic_list_model.js',
                    'src/js/models/realm_config_model.js',
                    'src/js/models/security_config_model.js',
                    'src/js/models/service_config_model.js',
                    'src/js/models/service_defaults_config_model.js',
                    'src/js/models/service_dynamic_data_model.js',
                    'src/js/models/session_dynamic_data_model.js',
                    'src/js/models/system_model.js'
		],
		dest: 'dist/tmp/js/models.js'
	    },
	    panels: {
		src: [ 
                    'src/js/panels/about_panel.js',
                    'src/js/panels/update_panel.js',
                    'src/js/panels/login_panel.js',
                    'src/js/panels/monitor_filter_panel.js',
                    'src/js/panels/splitpanel.js',
		],
		dest: 'dist/tmp/js/panels.js'
	    },
	    charts: {
		src: [ 
                    'src/js/charts/cpu_all_perc_chart.js',
                    'src/js/charts/cpu_avg_perc_chart.js',
                    'src/js/charts/current_sessions_chart.js',
                    'src/js/charts/dashboard_chart.js',
                    'src/js/charts/jvm_heap_chart.js',
                    'src/js/charts/nic_read_thpt_combined_chart.js',
                    'src/js/charts/nic_read_thpt_indiv_chart.js',
                    'src/js/charts/nic_rw_thpt_combined_chart.js',
                    'src/js/charts/nic_write_thpt_combined_chart.js',
                    'src/js/charts/nic_write_thpt_indiv_chart.js'
		],
		dest: 'dist/tmp/js/charts.js'
	    },
	    views: {
		src: [ 
                    'src/js/views/cluster_realm_config_view.js',
                    'src/js/views/cluster_service_config_view.js',
                    'src/js/views/config_licenses_view.js',
                    'src/js/views/config_overview_view.js',
                    'src/js/views/config_security_keystore_view.js',
                    'src/js/views/config_security_realms_view.js',
                    'src/js/views/config_security_truststore_view.js',
                    'src/js/views/config_service_defaults_view.js',
                    'src/js/views/config_services_view.js',
                    'src/js/views/dashboard_view.js',
                    'src/js/views/gateway_config_view.js',
                    'src/js/views/gateway_realm_config_view.js',
                    'src/js/views/gateway_service_config_view.js',
                    'src/js/views/jvm_view.js',
                    'src/js/views/kaazing_view.js',
                    'src/js/views/monitor_gateways_view.js',
                    'src/js/views/monitor_services_view.js',
                    'src/js/views/monitor_sessions_view.js'
		],
		dest: 'dist/tmp/js/views.js'
	    },
	    base: {
		src: [ 
                    'src/js/utils.js',
                    'src/js/setup.js',
                    'src/js/constants.js'
		],
		dest: 'dist/tmp/js/base.js'
	    },
	    api: {
		src: [ 
                    'src/js/SNMP.js',
                    'src/js/mngt_oids.js',
                    'src/js/mngtapi.js',
                    'src/js/mngtapi_snmp.js'
		],
		dest: 'dist/tmp/js/api.js'
	    },
	    general: {
		src: [ 
                    'src/js/yui-patches.js',
                    'src/js/main.js',
                    'src/js/command_center_challenge_handler.js',
                    'src/js/filter.js',
                    'src/js/menu_support.js',
                    'src/js/command_center.js',
                    'src/js/login_processor.js'
		],
		dest: 'dist/tmp/js/general.js'
	    }
	},


        uglify: {
            options: {
                compress: {
                    unused: false,
                },
                mangle: true,
                unused: false,
                banner: '/**\n' + 
                        ' * Copyright (c) 2007-2014, Kaazing Corporation. All rights reserved.\n' + 
                        '*/\n'
            },
	    models: {
		src: 'dist/tmp/js/models.js',
		dest: 'dist/commandcenter/js/models.js'
	    },
	    panels: {
		src: 'dist/tmp/js/panels.js',
		dest: 'dist/commandcenter/js/panels.js'
	    },
	    charts: {
		src: 'dist/tmp/js/charts.js',
		dest: 'dist/commandcenter/js/charts.js'
	    },
	    views: {
		src: 'dist/tmp/js/views.js',
		dest: 'dist/commandcenter/js/views.js'
	    },
	    base: {
		src: 'dist/tmp/js/base.js',
		dest: 'dist/commandcenter/js/base.js'
	    },
	    api: {
		src: 'dist/tmp/js/api.js',
		dest: 'dist/commandcenter/js/api.js'
	    },
	    general: {
		src: 'dist/tmp/js/general.js',
		dest: 'dist/commandcenter/js/general.js'
	    },
            browserDetect: {
                src: 'src/js/browser_detect.js',
                dest: 'dist/commandcenter/js/browser_detect.js'
            },
            testSupport: {
                src: 'src/js/test_support.js',
                dest: 'dist/commandcenter/js/test_support.js'
            }
        },

        karma: {
            test: {
                configFile: 'test/karma.config.js'
            },
        },
    });

    grunt.loadNpmTasks('grunt-contrib-concat');

    grunt.loadNpmTasks('grunt-contrib-copy');

    grunt.loadNpmTasks('grunt-contrib-clean');

    grunt.loadNpmTasks('grunt-karma');

    grunt.loadNpmTasks('grunt-contrib-uglify');

    grunt.registerTask('default', ['clean', 'copy', 'concat', 'uglify', 'clean:tmp']);
    
    grunt.registerTask('test', ['karma']);

};

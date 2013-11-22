(function(global){
	/*
	enter page size and cache size page
	*/
	var PageThree = Backbone.View.extend({    
	
		el: '#page3',
		model: global.mainmodel,	
		events: {
		    "click .next-button":"nextFunction",    //next button
			"click .back-button":"backFunction",	//back button
			"blur .page-size-text":"checkPageSize",   //pagesize textbox blur
			"blur .cache-size-text":"checkCacheSize"  //cachesize textbox blur
		},		
		initialize: function(){
			this.ready_next=false;
			this.page_size= 0;
			this.cache_size=0;
		},
		nextFunction:function(){		//go to page4
			if(this.ready_next===true&&this.page_size!==0&&this.cache_size!==0) {
				global.mainmodel.set('pageSize',this.page_size);
				global.getData(this.page_size, this.cache_size);
				global.mainmodel.set('mainWindow','page4');
			}			
		},
		backFunction:function(){   //go back to page2
			global.mainmodel.set('mainWindow','page2');
		},
		checkPageSize:function(){		//check page size format
			if(/^\d+$/.test($(".page-size-text").val())===false){
				$(".page-alert").show();
				this.ready_next =false;
			}
			else{
				this.page_size = parseInt($(".page-size-text").val());
				if(this.page_size<1||this.page_size>100){
					$(".page-alert").show();
					this.ready_next =false;
				}
				else{
					$(".page-alert").hide();
					this.ready_next =true;
				}			
			}
		},
		checkCacheSize:function(){		//check cache size format
			if(/^\d+$/.test($(".cache-size-text").val())===false){
				$(".cache-alert").show();
				this.ready_next =false;
			}
			else{
				this.cache_size = parseInt($(".cache-size-text").val());
				if(this.cache_size<1||this.cache_size>100){
					$(".cache-alert").show();
					this.ready_next =false;
				}
				else{
					$(".cache-alert").hide();
					this.ready_next =true;
				}	
			}
		}
	});
	
	global.PageThree = PageThree;

}(BX));








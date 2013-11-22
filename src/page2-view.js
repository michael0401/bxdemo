(function(global){
	
	var PageTwo = Backbone.View.extend({      //select sites window view
	
		el: '#page2',
		model: global.mainmodel,	
		events: {
		    "click .default-button":"goDefault",
			"click .upload-button":"upload"
		},		
		initialize: function(){
		
		},
		goDefault:function(){
			global.mainmodel.set('mainWindow','page3');
		},
		upload:function(){
			
		}
	});
	
	global.PageTwo = PageTwo;

}(BX));








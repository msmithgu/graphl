var container = d3.select('body').append("form")
  , textEntry = container.append("textarea")
  , svg = container.append("svg")
  ;

d3.text('graph.txt', function(dsldata) {
  textEntry.text(dsldata);

  translate();
});

function translate() {
  var dsldata = textEntry.text()
    , statements = convertDSLtoStatements(dsldata)
    , links = []
    ;
  statements.forEach(function(statement) {
    links.push({ source: statement.subject
               , target: statement.noun
               , label:  statement.verb
               });
  });

  buildGraph(svg, links);
}

function lineIndent(s) {
  var sa = s.match(/^( *)(.*)$/);
  return sa
    ? { indent: sa[1].length , value:  sa[2] }
    : { indent: 0     , value:  s     }
}

function processLines(lines) {
  // assuming "noun verb noun", 3 levels, 2 space indents, no wild jumps
  var i = 0
    , diff = 0
    , ll
    , pl = lineIndent(lines[i]).value
    , stack = [pl]
    , list = []
    ;

  while (++i < lines.length) {
    ll = pl;
    pl = lineIndent(lines[i]);
    diff = (pl.indent - ll.indent) / 2;
    if (diff <= 0) {
      d3.range(Math.abs(diff) + 1).forEach(function(){
        stack.pop();
      });
    }
    stack.push(pl.value);
    if (stack.length == 3) {
      list.push({ subject: stack[0]
                , verb:    stack[1]
                , noun:    stack[2]
                });
    }
  }

  return list;
}

function convertDSLtoStatements(dsldata) {
  var lines = dsldata.split('\n')
    , obj = {}
    ;

  return processLines(lines);
}

function buildGraph(svg, links, nodes) {
  var width  = parseInt(svg.style('width'))
    , height = parseInt(svg.style('height'))
    , links = links || []
    , nodes = nodes || {}
    , labels = []
    ;

  links.forEach(function(d) {
      labels.push(d.label.replace(/ /,'-'));
    });

  // Compute the distinct nodes from the links.
  links.forEach(function(link) {
    link.source = nodes[link.source]
             || ( nodes[link.source] = {name: link.source} );
    link.target = nodes[link.target]
             || ( nodes[link.target] = {name: link.target} );
  });

  var force = d3.layout.force()
      .nodes(d3.values(nodes))
      .links(links)
      .size([width, height])
      .linkDistance(150)
      .charge(-1700)
      .on("tick", tick)
      .start();

  // Per-type markers, as they don't inherit styles?
  svg.append("svg:defs").selectAll("marker")
      .data(labels)
    .enter().append("svg:marker")
      .attr("id", String)
      .attr("viewBox", "0 -5 10 10")
      .attr("refX", 15)
      .attr("refY", -1.5)
      .attr("markerWidth", 6)
      .attr("markerHeight", 6)
      .attr("orient", "auto")
    .append("svg:path")
      .attr("d", "M0,-5L10,0L0,5");

  var path = svg.append("svg:g").selectAll("path")
      .data(force.links())
    .enter().append("path")
      .attr("class", function(d) { return "link " + d.type; })
      .attr("marker-end", function(d) { return "url(#" + d.label.replace(/ /,'-') + ")"; });

  var path_text = svg.append("svg:g").selectAll(".path-text")
      .data(force.links(), function (d){ return d.label; })
    .enter().append("text").attr("class", "path-text")
      .text(function(d) { return d.label; });

  var node = svg.append("svg:g").selectAll(".node")
      .data(force.nodes())
    .enter().append("g")
      .attr("class", "node")
      .on("mouseover", mouseover)
      .on("mouseout", mouseout)
      .call(force.drag);

  node.append("circle")
      .attr("class", "node")
      .attr("r", 4);

  node.append("text")
      .attr("x", 12)
      .attr("dy", ".35em")
      .text(function(d) { return d.name; });

  function tick() {
    path.attr("d", function (d) {
        var dx = d.target.x - d.source.x
          , dy = d.target.y - d.source.y
          , dr = Math.sqrt(dx * dx + dy * dy);
        return "M" + d.source.x + "," + d.source.y + "A" + dr + "," + dr + " 0 0,1 " + d.target.x + "," + d.target.y;
      });

    path_text
        .attr("transform", function(d) {
            var dx = (d.target.x - d.source.x)
              , dy = (d.target.y - d.source.y)
              , dr = Math.sqrt(dx * dx + dy * dy)
              , sinus = dy/dr
              , cosinus = dx/dr
              , l = d.label.length*6
              , hoffset = (1 - (l / dr )) / 2
              , voffset = dr / 6
              , x= d.source.x + dx*hoffset + voffset*sinus
              , y= d.source.y + dy*hoffset - voffset*cosinus;

            return "translate(" + x + "," + y + ") matrix("+cosinus+", "+sinus+", "+-sinus+", "+cosinus+", 0, 0)";
          });

    node
        .attr("transform", function(d) { return "translate(" + d.x + "," + d.y + ")"; });
  }

  function mouseover() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 8);
  }

  function mouseout() {
    d3.select(this).select("circle").transition()
        .duration(750)
        .attr("r", 4);
  }

}

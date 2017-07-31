module Jekyll
  class PostAjaxPart < Page
    def initialize(site, base, dir, category)
      @site = site
      @base = base
      @dir = dir
      @name = 'index.html'

      self.process(@name)
      self.read_yaml(File.join(base, '_layouts'), 'post_ajax_part.html')
    end
  end

  class PostAjaxPartGenerator < Generator
    safe true
    priority :low

    def generate(site)
      dir = '_site/ajax/'

      # Converter for .md > .html
      converter = site.getConverterImpl(Jekyll::Converters::Markdown)

      # Iterate over all posts
      site.posts.each do |post|

        # Encode the HTML to JSON
        html = converter.convert(post.content)
        title = post.title.downcase.tr(' ', '-').delete("’!")

        # Start building the path
        path = "_site/ajax/"

        # Add categories to path if they exist
        if (post.data['categories'].class == String)
          path << post.data['categories'].tr(' ', '/')
        elsif (post.data['categories'].class == Array)
          path <<  post.data['categories'].join('/')
        end

        # Add the sanitized post title to complete the path
        path << "/#{title}"

        # Create the directories from the path
        FileUtils.mkpath(path) unless File.exists?(path)

        # Create the JSON file and inject the data
        f = File.new("#{path}/raw.json", "w+")
        f.puts JSON.generate(hash)
      end

    end

  end

end
